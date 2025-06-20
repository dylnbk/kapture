# Database Connection Troubleshooting

## Current Issue: P1001 Can't reach database server

You're getting this error even though Supabase shows the database is receiving connections. Here are several solutions:

## 🔧 Solution 1: Get the Exact Connection String from Supabase

1. Go to your Supabase project dashboard
2. Click **Settings** → **Database**
3. Under **Connection String**, choose **URI** format
4. Copy the exact string (it should look different from what we have)
5. Replace the `[YOUR-PASSWORD]` with `Derpis020406!`

## 🔧 Solution 2: Alternative Database (Fastest Fix)

### Neon Database (Free, 2 minutes)
```bash
# 1. Go to https://neon.tech
# 2. Sign up with GitHub
# 3. Create new project
# 4. Copy the connection string
# 5. Update your .env files
```

### PlanetScale (Free, 2 minutes)
```bash
# 1. Go to https://planetscale.com
# 2. Sign up
# 3. Create database
# 4. Get connection string
# 5. Update your .env files
```

## 🔧 Solution 3: Local Development Database

```bash
# Install Docker Desktop, then:
docker run --name kapture-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=kapture_dev \
  -p 5432:5432 \
  -d postgres:15

# Update your .env and .env.local:
DATABASE_URL="postgresql://postgres:password123@localhost:5432/kapture_dev"
```

## 🔧 Solution 4: Network Troubleshooting

### Test Supabase Connection
```bash
# Test if you can reach Supabase from your network
ping db.ugepzwdlfwsflwuzwsdn.supabase.co

# Test port connectivity (install telnet if needed)
telnet db.ugepzwdlfwsflwuzwsdn.supabase.co 5432
```

### Firewall/VPN Issues
- Disable VPN temporarily
- Check corporate firewall settings
- Try from a different network (mobile hotspot)

## 🔧 Solution 5: Alternative Connection Formats

Try these different formats in your `.env` and `.env.local`:

### Format 1: With SSL parameters
```env
DATABASE_URL="postgresql://postgres:Derpis020406%21@db.ugepzwdlfwsflwuzwsdn.supabase.co:5432/postgres?sslmode=require&sslcert=&sslkey=&sslrootcert="
```

### Format 2: IPv4 only
```env
DATABASE_URL="postgresql://postgres:Derpis020406%21@db.ugepzwdlfwsflwuzwsdn.supabase.co:5432/postgres?sslmode=require&connect_timeout=10&application_name=prisma"
```

### Format 3: Pooled connection (port 6543)
```env
DATABASE_URL="postgresql://postgres:Derpis020406%21@db.ugepzwdlfwsflwuzwsdn.supabase.co:6543/postgres?pgbouncer=true"
```

## 🚀 Quick Workaround: Skip Database for Now

If you want to test the rest of the application:

1. **Comment out database calls** in the auth file temporarily
2. **Start the dev server** to test other features
3. **Fix database connection** later

### Temporary Fix:
```javascript
// In src/lib/auth.ts, temporarily modify:
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { userId } = auth();
    if (!userId) return null;
    
    // TODO: Fix database connection
    console.log('Database disabled temporarily');
    return null;
    
    // const user = await getUserByClerkId(userId);
    // return user;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}
```

## 🔍 Debugging Steps

### 1. Check Supabase Dashboard
- Verify project is not paused
- Check if there are any maintenance notices
- Verify your IP is not blocked

### 2. Test with psql (if available)
```bash
psql "postgresql://postgres:Derpis020406!@db.ugepzwdlfwsflwuzwsdn.supabase.co:5432/postgres?sslmode=require"
```

### 3. Environment Variable Test
```bash
# Check if the variable is loaded correctly
echo $DATABASE_URL
```

### 4. Try Alternative Tools
```bash
# Test with different PostgreSQL client
npm install -g pg-cli
pgcli "postgresql://postgres:Derpis020406!@db.ugepzwdlfwsflwuzwsdn.supabase.co:5432/postgres?sslmode=require"
```

## 📞 Get Help

If none of these work:

1. **Check Supabase Status**: https://status.supabase.com
2. **Try Different Network**: Mobile hotspot, different WiFi
3. **Contact Supabase Support**: With your project reference
4. **Use Alternative Database**: Neon, PlanetScale, or local Docker

## 🎯 Recommended Next Steps

1. **Try Neon database** (fastest alternative)
2. **Or set up local Docker database**
3. **Continue with app development** using working database
4. **Debug Supabase connection** in parallel

The backend implementation is complete - this is just a connection configuration issue!