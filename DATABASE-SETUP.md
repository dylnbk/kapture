# Kapture Database Setup Guide

## 🚨 Quick Fix for Current Error

The error indicates you're using placeholder database credentials. Here are the fastest ways to get a working database:

## Option 1: Free Cloud Database (Recommended - 2 minutes)

### Supabase (Free tier available)
1. Go to [supabase.com](https://supabase.com)
2. Create a free account
3. Click "New Project"
4. Choose organization, enter project name and password
5. Wait for project to be created (1-2 minutes)
6. Go to **Settings > Database**
7. Copy the connection string that looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
8. Replace `DATABASE_URL` in your `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@db.your_ref.supabase.co:5432/postgres"
   ```

### Alternative: Neon (Free tier)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string
5. Update your `.env.local`

## Option 2: Local PostgreSQL Setup

### Windows (using Docker)
```bash
# Install Docker Desktop first, then run:
docker run --name kapture-postgres \
  -e POSTGRES_USER=kapture_user \
  -e POSTGRES_PASSWORD=kapture_password \
  -e POSTGRES_DB=kapture_dev \
  -p 5432:5432 \
  -d postgres:15

# Update your .env.local:
DATABASE_URL="postgresql://kapture_user:kapture_password@localhost:5432/kapture_dev"
```

### Windows (native installation)
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Install with these settings:
   - Username: `kapture_user`
   - Password: `kapture_password`
   - Database: `kapture_dev`
   - Port: `5432`
3. Update `.env.local`:
   ```env
   DATABASE_URL="postgresql://kapture_user:kapture_password@localhost:5432/kapture_dev"
   ```

## Option 3: Redis Setup (Also Required)

### Free Cloud Redis
1. Go to [upstash.com](https://upstash.com)
2. Create free account
3. Create Redis database
4. Copy the Redis URL
5. Update `.env.local`:
   ```env
   REDIS_URL="rediss://default:your_password@your_host.upstash.io:6380"
   ```

### Local Redis (Docker)
```bash
docker run --name kapture-redis -p 6379:6379 -d redis:7-alpine

# Update your .env.local:
REDIS_URL="redis://localhost:6379"
```

## 🔧 Complete Setup Steps

### 1. Update Environment File
After setting up your database, your `.env.local` should look like:

```env
# Database (replace with your actual database URL)
DATABASE_URL="postgresql://postgres:your_password@db.your_ref.supabase.co:5432/postgres"

# Redis (replace with your actual Redis URL)  
REDIS_URL="redis://localhost:6379"

# Clerk Authentication (get these from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here
CLERK_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

# The rest can be added later as you set up each service
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
APIFY_API_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_ENDPOINT=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secure_random_string_here
NODE_ENV=development
```

### 2. Set Up Database Schema

**Important**: Prisma needs the DATABASE_URL in both `.env.local` (for Next.js) and `.env` (for Prisma CLI).

```bash
# Copy your DATABASE_URL from .env.local to .env file
# Then run:

# Generate Prisma client
npm run db:generate

# Push schema to your database
npm run db:push
```

**Quick Fix**: Copy your DATABASE_URL value from `.env.local` and paste it into the `.env` file that was created.

### 3. Verify Connection
```bash
# Start the development server
npm run dev

# Check health endpoint
curl http://localhost:3000/api/health
```

## 🚀 Minimal Working Setup

To get the app running with just database access:

### Required immediately:
- ✅ `DATABASE_URL` (Supabase recommended)
- ✅ `REDIS_URL` (Upstash recommended)
- ⚠️ `NEXTAUTH_SECRET` (any random string)

### Can be added later:
- `CLERK_*` (for authentication)
- `STRIPE_*` (for billing)
- `OPENAI_API_KEY` (for AI features)
- `APIFY_API_TOKEN` (for scraping)
- `CLOUDFLARE_R2_*` (for file storage)

## 🔍 Troubleshooting

### Common Issues

#### "Invalid database credentials"
- Double-check your DATABASE_URL
- Ensure no typos in username/password
- Verify database exists and is accessible

#### "Database does not exist"
- Create the database in your PostgreSQL instance
- Or use a cloud service that auto-creates it

#### "Connection refused"
- Check if PostgreSQL is running
- Verify the port (usually 5432)
- Check firewall settings

#### "SSL required"
- Many cloud databases require SSL
- Your DATABASE_URL should include `?sslmode=require`

### Test Database Connection
```bash
# Test with psql (if installed)
psql "postgresql://your_user:your_password@your_host:5432/your_db"

# Or test the API health endpoint
curl http://localhost:3000/api/health
```

## 📱 Quick Start Commands

```bash
# 1. Set up database URL in .env.local
# 2. Install dependencies (if not done)
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Push schema to database
npm run db:push

# 5. Start development server
npm run dev
```

The database connection error should be resolved once you update the `DATABASE_URL` with real credentials! 🎉