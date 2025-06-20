import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  
  // Apify
  APIFY_API_TOKEN: z.string().min(1, 'APIFY_API_TOKEN is required'),
  
  // Cloudflare R2
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1, 'CLOUDFLARE_R2_ACCESS_KEY_ID is required'),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1, 'CLOUDFLARE_R2_SECRET_ACCESS_KEY is required'),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1, 'CLOUDFLARE_R2_BUCKET_NAME is required'),
  CLOUDFLARE_R2_ENDPOINT: z.string().url('CLOUDFLARE_R2_ENDPOINT must be a valid URL'),
  
  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  
  // yt-dlp Service (optional)
  YTDLP_SERVICE_URL: z.string().url().optional(),
  
  // Next.js
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  
  // Optional environment variables
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_VERSION: z.string().optional(),
  CRON_SECRET_TOKEN: z.string().optional(),
  MONITORING_WEBHOOK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnvironment(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((issue) => {
        console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
      });
      
      // In development, provide helpful guidance
      if (process.env.NODE_ENV === 'development') {
        console.error('\n💡 To fix this:');
        console.error('  1. Copy .env.example to .env.local');
        console.error('  2. Fill in all required environment variables');
        console.error('  3. Restart the development server\n');
      }
    } else {
      console.error('❌ Unexpected error during environment validation:', error);
    }
    
    process.exit(1);
  }
}

// Utility function to get validated environment
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnvironment() first.');
  }
  return validatedEnv;
}

// Helper function to check if all optional services are configured
export function getServiceAvailability() {
  const env = getEnv();
  
  return {
    ytdlpService: !!env.YTDLP_SERVICE_URL,
    cronJobs: !!env.CRON_SECRET_TOKEN,
    monitoring: !!env.MONITORING_WEBHOOK_URL,
    development: env.NODE_ENV === 'development',
    production: env.NODE_ENV === 'production',
  };
}

// Export environment validation for use in next.config.js or startup
export default validateEnvironment;