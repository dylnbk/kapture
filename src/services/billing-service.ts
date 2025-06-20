import Stripe from 'stripe';
import { db } from '../lib/db';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/redis-dev';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    scrapeRequests: number;
    downloads: number;
    aiGenerations: number;
    storage: number; // in GB
  };
}

export interface UsageQuota {
  scrapeRequests: { current: number; limit: number };
  downloads: { current: number; limit: number };
  aiGenerations: { current: number; limit: number };
  storage: { current: number; limit: number };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  customerId?: string;
}

class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10',
    });
  }

  private readonly SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      interval: 'month',
      features: [
        'Basic trend scraping',
        'Limited downloads',
        'Basic AI assistance',
        '1GB storage',
      ],
      limits: {
        scrapeRequests: 10,
        downloads: 5,
        aiGenerations: 10,
        storage: 1,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious content creators',
      price: 2999, // $29.99 in cents
      interval: 'month',
      features: [
        'Unlimited trend scraping',
        'Unlimited downloads',
        'Advanced AI features',
        '50GB storage',
        'Priority support',
      ],
      limits: {
        scrapeRequests: 1000,
        downloads: 500,
        aiGenerations: 500,
        storage: 50,
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and agencies',
      price: 9999, // $99.99 in cents
      interval: 'month',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'API access',
        '500GB storage',
        'Custom integrations',
        'Dedicated support',
      ],
      limits: {
        scrapeRequests: 10000,
        downloads: 5000,
        aiGenerations: 2000,
        storage: 500,
      },
    },
  ];

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.SUBSCRIPTION_PLANS;
  }

  async getUserSubscription(userId: string): Promise<any> {
    // Check cache first
    const cacheKey = CACHE_KEYS.USER_SUBSCRIPTION(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    // If user doesn't exist or has no subscription, return free plan
    if (!user?.subscription) {
      const freePlan = this.SUBSCRIPTION_PLANS.find(p => p.id === 'free') || this.SUBSCRIPTION_PLANS[0];
      const result = {
        plan: freePlan,
        isActive: true,
        status: 'active',
        priceId: null,
      };
      
      // Cache the free plan result briefly
      await cache.set(cacheKey, result, 60); // 1 minute cache for free plan
      return result;
    }

    const subscription = user.subscription;
    
    // Get plan details
    const plan = this.SUBSCRIPTION_PLANS.find(p => p.id === this.getPlanIdFromPriceId(subscription.priceId));
    
    const result = {
      ...subscription,
      plan,
      isActive: subscription.status === 'active',
    };

    // Cache the result
    await cache.set(cacheKey, result, CACHE_TTL.USER_SUBSCRIPTION);

    return result;
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CheckoutSession> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.subscription?.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
          clerkUserId: user.clerkUserId,
        },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
        clerkUserId: user.clerkUserId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
      customerId,
    };
  }

  async createPortalSession(userId: string): Promise<string> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription?.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    });

    return session.url;
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
    await this.updateSubscriptionInDatabase(userId, subscription, session.customer as string);
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customer = await this.stripe.customers.retrieve(subscription.customer as string);
    const userId = (customer as Stripe.Customer).metadata?.userId;
    
    if (!userId) return;

    await this.updateSubscriptionInDatabase(userId, subscription, subscription.customer as string);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await db.userSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if (invoice.subscription) {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
      const customer = await this.stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.userId;
      
      if (userId) {
        await this.updateSubscriptionInDatabase(userId, subscription, subscription.customer as string);
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Handle payment failure - could send notification, update status, etc.
    console.log('Payment failed for invoice:', invoice.id);
  }

  private async updateSubscriptionInDatabase(
    userId: string,
    subscription: Stripe.Subscription,
    customerId: string
  ) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await db.userSubscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      create: {
        userId,
        clerkUserId: user.clerkUserId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    // Clear cache
    await cache.delete(CACHE_KEYS.USER_SUBSCRIPTION(userId));
  }

  async getUserUsage(userId: string): Promise<UsageQuota> {
    // Check if this is the test superuser account - show unlimited quotas
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      if (user?.email === 'dyln.bk@gmail.com') {
        console.log('Superuser detected - showing unlimited quotas:', user.email);
        return {
          scrapeRequests: {
            current: 0,
            limit: 999999,
          },
          downloads: {
            current: 0,
            limit: 999999,
          },
          aiGenerations: {
            current: 0,
            limit: 999999,
          },
          storage: {
            current: 0,
            limit: 999999 * 1024 * 1024 * 1024, // 999TB
          },
        };
      }
    } catch (error) {
      console.warn('Error checking superuser status for usage:', error);
      // Continue with normal usage calculation if lookup fails
    }

    const cacheKey = CACHE_KEYS.USER_USAGE(userId, this.getCurrentPeriod());
    const cached = await cache.get<UsageQuota>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [scrapeUsage, downloadUsage, aiUsage] = await Promise.all([
      this.getUsageForType(userId, 'scrape', periodStart, periodEnd),
      this.getUsageForType(userId, 'download', periodStart, periodEnd),
      this.getUsageForType(userId, 'ai_generation', periodStart, periodEnd),
    ]);

    const subscription = await this.getUserSubscription(userId);
    const plan = subscription?.plan || this.SUBSCRIPTION_PLANS[0]; // Default to free plan

    const usage: UsageQuota = {
      scrapeRequests: {
        current: scrapeUsage,
        limit: plan.limits.scrapeRequests,
      },
      downloads: {
        current: downloadUsage,
        limit: plan.limits.downloads,
      },
      aiGenerations: {
        current: aiUsage,
        limit: plan.limits.aiGenerations,
      },
      storage: {
        current: 0, // Would calculate from actual storage usage
        limit: plan.limits.storage * 1024 * 1024 * 1024, // Convert GB to bytes
      },
    };

    await cache.set(cacheKey, usage, CACHE_TTL.USER_USAGE);
    return usage;
  }

  private async getUsageForType(
    userId: string,
    usageType: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const usage = await db.userUsage.findFirst({
      where: {
        userId,
        usageType,
        periodStart,
        periodEnd,
      },
    });

    return usage?.count || 0;
  }

  async checkUsageLimit(userId: string, usageType: 'scrape' | 'download' | 'ai_generation'): Promise<boolean> {
    // Check if this is the test superuser account - give unlimited access
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      if (user?.email === 'dyln.bk@gmail.com') {
        console.log('Superuser detected - granting unlimited access:', user.email);
        return true; // Unlimited access for test account
      }
    } catch (error) {
      console.warn('Error checking superuser status:', error);
      // Continue with normal usage check if lookup fails
    }
    
    const usage = await this.getUserUsage(userId);
    
    switch (usageType) {
      case 'scrape':
        return usage.scrapeRequests.current < usage.scrapeRequests.limit;
      case 'download':
        return usage.downloads.current < usage.downloads.limit;
      case 'ai_generation':
        return usage.aiGenerations.current < usage.aiGenerations.limit;
      default:
        return false;
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getPlanIdFromPriceId(priceId: string | null): string {
    // This would map Stripe price IDs to plan IDs
    // For now, return a default mapping
    const priceIdToPlan: Record<string, string> = {
      'price_pro_monthly': 'pro',
      'price_enterprise_monthly': 'enterprise',
    };

    return priceIdToPlan[priceId || ''] || 'free';
  }
}

export const billingService = new BillingService();