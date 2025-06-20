# Kapture Backend Implementation Guide

## 🎉 Implementation Status: COMPLETE

The Kapture backend is **fully implemented** with production-ready APIs, external service integrations, and robust infrastructure. This guide covers setup, usage, and architecture.

## 📋 Features Implemented

### ✅ Core API Functionality
- **Authentication**: Complete Clerk integration with user sync
- **Database**: Prisma ORM with PostgreSQL
- **Validation**: Zod schemas for all inputs
- **Error Handling**: Comprehensive error responses
- **Rate Limiting**: Redis-based rate limiting
- **Usage Tracking**: Quota enforcement by subscription tier

### ✅ External Service Integrations
- **Apify**: YouTube, TikTok, Reddit, Twitter scraping
- **OpenAI**: AI content generation with caching
- **Cloudflare R2**: Media storage with presigned URLs
- **Stripe**: Subscription management and webhooks
- **Redis**: Caching and session management

### ✅ API Endpoints (25+ routes)

#### Authentication
- `POST /api/auth/sync` - Sync user with Clerk
- `GET /api/auth/user` - Get current user
- `DELETE /api/auth/user` - Delete user account

#### Billing & Subscriptions
- `GET /api/billing/plans` - Get subscription plans
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Access billing portal
- `GET /api/billing/subscription` - Get user subscription
- `GET /api/billing/usage` - Get usage statistics

#### Trends & Scraping
- `GET /api/trends` - List user trends
- `GET /api/trends/[id]` - Get specific trend
- `POST /api/trends/scrape` - Scrape single platform
- `POST /api/trends/bulk-scrape` - Scrape multiple platforms
- `DELETE /api/trends/[id]` - Delete trend

#### Downloads & Media
- `GET /api/downloads` - List user downloads
- `GET /api/downloads/[id]` - Get download status
- `POST /api/downloads/request` - Request new download
- `POST /api/downloads/bulk` - Bulk download request
- `DELETE /api/downloads/[id]` - Cancel/delete download

#### AI & Content Generation
- `POST /api/ai/generate` - Generate AI content
- `POST /api/ai/ideaboard` - Generate AI ideaboard
- `GET /api/ai/generations` - List AI generations

#### Ideaboards
- `GET /api/ideaboards` - List user ideaboards
- `POST /api/ideaboards` - Create ideaboard
- `GET /api/ideaboards/[id]` - Get ideaboard
- `PUT /api/ideaboards/[id]` - Update ideaboard
- `DELETE /api/ideaboards/[id]` - Delete ideaboard

#### Library & Search
- `GET /api/library` - Browse media library
- `GET /api/library/search` - Search library content
- `POST /api/library/organize` - Organize library items

#### Background Jobs
- `GET /api/jobs` - List background jobs
- `POST /api/jobs/cancel` - Cancel background job

#### System & Health
- `GET /api/health` - Health check endpoint
- `HEAD /api/health` - Simple liveness check

#### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/clerk` - Clerk webhook handler

#### Cron Jobs (Protected)
- `POST /api/cron/scrape-trends` - Automated trend scraping
- `POST /api/cron/cleanup-media` - Media cleanup job
- `POST /api/cron/usage-reset` - Monthly usage reset

## 🚀 Quick Setup

### 1. Environment Configuration

Copy the environment file and configure all services:

```bash
cp .env.example .env.local
```

### 2. Required Services

#### PostgreSQL Database
```bash
# Local setup with Docker
docker run --name kapture-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=kapture_dev \
  -p 5432:5432 -d postgres:15
```

#### Redis Cache
```bash
# Local setup with Docker
docker run --name kapture-redis \
  -p 6379:6379 -d redis:7-alpine
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Optional: Seed with sample data
npm run db:seed
```

### 4. External Services

#### Clerk Authentication
1. Create account at [clerk.com](https://clerk.com)
2. Set up application
3. Configure webhook endpoints
4. Add keys to `.env.local`

#### Stripe Billing
1. Create account at [stripe.com](https://stripe.com)
2. Set up products and pricing
3. Configure webhook endpoints
4. Add keys to `.env.local`

#### OpenAI API
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local`

#### Apify Scraping
1. Create account at [apify.com](https://apify.com)
2. Get API token
3. Add to `.env.local`

#### Cloudflare R2
1. Set up R2 bucket in Cloudflare dashboard
2. Create API tokens with R2 permissions
3. Add credentials to `.env.local`

### 5. Start Development

```bash
npm run dev
```

## 🏗️ Architecture Overview

### Service Layer Architecture

```
┌─────────────────────────────────────────┐
│                Frontend                 │
│            (Next.js App)               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│              API Layer                  │
│         (Next.js API Routes)           │
├─────────────────────────────────────────┤
│             Middleware                  │
│  • Authentication (Clerk)              │
│  • Validation (Zod)                    │
│  • Rate Limiting (Redis)               │
│  • Usage Enforcement                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│            Service Layer                │
│  • AI Service (OpenAI)                 │
│  • Apify Service (Scraping)            │
│  • Storage Service (R2)                │
│  • Billing Service (Stripe)            │
│  • Media Service (yt-dlp)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│           Data & Cache Layer            │
│  • PostgreSQL (Prisma)                 │
│  • Redis (Caching)                     │
│  • Cloudflare R2 (Files)               │
└─────────────────────────────────────────┘
```

### Database Schema

The Prisma schema includes:
- **Users**: Synced with Clerk
- **UserSubscriptions**: Stripe billing integration  
- **UserUsage**: Quota tracking by usage type
- **Trends**: Scraped social media content
- **MediaDownloads**: Downloaded media files
- **Ideaboards**: AI-generated content strategies
- **AiGenerations**: AI generation history
- **BackgroundJobs**: Async job processing

### Key Features

#### Circuit Breaker Pattern
All external service calls use circuit breakers to handle failures gracefully:

```typescript
const circuitBreaker = new CircuitBreaker(5, 60000);
await circuitBreaker.execute(() => externalServiceCall());
```

#### Caching Strategy
- User data: 5 minutes TTL
- Trends: 15 minutes TTL  
- AI generations: 1 hour TTL
- Download status: 30 seconds TTL

#### Usage Enforcement
Each API call checks user quotas before proceeding:

```typescript
const hasUsage = await billingService.checkUsageLimit(userId, 'scrape');
if (!hasUsage) {
  return createUsageExceededError('scrape');
}
```

## 🔧 Advanced Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `CLERK_SECRET_KEY` | ✅ | Clerk authentication |
| `STRIPE_SECRET_KEY` | ✅ | Stripe billing |
| `OPENAI_API_KEY` | ✅ | OpenAI API access |
| `APIFY_API_TOKEN` | ✅ | Apify scraping service |
| `CLOUDFLARE_R2_*` | ✅ | R2 storage credentials |
| `CRON_SECRET_TOKEN` | ⚪ | Protect cron endpoints |
| `YTDLP_SERVICE_URL` | ⚪ | External yt-dlp service |
| `MONITORING_WEBHOOK_URL` | ⚪ | System monitoring |

### Deployment Considerations

#### Database
- Use managed PostgreSQL (AWS RDS, PlanetScale, Supabase)
- Enable connection pooling
- Set up read replicas for read-heavy workloads

#### Caching
- Use managed Redis (AWS ElastiCache, Upstash)
- Configure persistence for important cache data
- Set up Redis clustering for high availability

#### File Storage
- Cloudflare R2 is already configured
- Set up CDN for faster global access
- Configure lifecycle policies for old files

#### Background Jobs
- Set up proper job queue (Bull, BullMQ)
- Configure job retry policies
- Monitor job processing metrics

#### Monitoring
- Set up error tracking (Sentry)
- Configure performance monitoring
- Set up alerting for critical failures

### Security Best Practices

#### API Security
- All routes use proper authentication
- Request validation with Zod schemas
- Rate limiting prevents abuse
- CORS properly configured

#### Data Protection
- All external API keys in environment variables
- Database connections use SSL
- File uploads validated and sanitized
- User data isolated by user ID

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### API Testing
```bash
# Get subscription plans (public)
curl http://localhost:3000/api/billing/plans

# Test authenticated endpoint (requires valid session)
curl -H "Authorization: Bearer <clerk-token>" \
  http://localhost:3000/api/auth/user
```

## 📈 Performance Optimization

### Implemented Optimizations
- Database query optimization with proper indexes
- Redis caching for frequently accessed data
- Circuit breakers for external service resilience
- Connection pooling for database connections
- Response streaming for large data sets

### Monitoring Endpoints
- `/api/health` - Comprehensive system health
- Cache hit rates in Redis
- Database query performance
- External service response times

## 🚨 Troubleshooting

### Common Issues

#### Environment Variables
```bash
# Validate all environment variables
npm run dev
# Check console for validation errors
```

#### Database Connection
```bash
# Test database connection
npx prisma db push
```

#### External Services
```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

#### Redis Connection
Check Redis connectivity in health endpoint response.

## 🔄 Maintenance

### Regular Tasks
- Monitor usage quotas and billing
- Clean up old media files (automated)
- Reset monthly usage counters (automated)
- Review error logs and performance metrics

### Automated Jobs
- **Media Cleanup**: Runs daily to remove old files
- **Usage Reset**: Runs monthly to reset quotas  
- **Trend Scraping**: Runs for active users based on activity

The backend is production-ready and includes all necessary features for the Kapture application! 🎉