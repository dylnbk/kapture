# Cloudflare R2 Setup Guide

This guide will help you set up Cloudflare R2 for file storage in the Kapture application.

## Prerequisites

- A Cloudflare account (free tier available)
- Basic understanding of API keys and environment variables

## Step 1: Create Cloudflare Account and R2 Bucket

### 1.1 Sign up for Cloudflare
1. Go to [Cloudflare](https://www.cloudflare.com/)
2. Click "Sign Up" and create an account
3. Verify your email address

### 1.2 Enable R2 Storage
1. Log into your Cloudflare dashboard
2. In the sidebar, click **R2 Object Storage**
3. Click **Get Started** (if first time) or **Create Bucket**
4. Accept the R2 terms of service

### 1.3 Create an R2 Bucket
1. Click **Create Bucket**
2. Choose a unique bucket name (e.g., `kapture-uploads-prod` or `kapture-uploads-dev`)
3. Select a location (choose closest to your users for better performance)
4. Click **Create Bucket**

## Step 2: Generate API Credentials

### 2.1 Create R2 API Token
1. In your Cloudflare dashboard, go to **My Profile** (top right)
2. Click the **API Tokens** tab
3. Click **Create Token**
4. Click **Get started** next to **Custom token**

### 2.2 Configure Token Permissions
Set up the token with these permissions:
- **Account**: `Cloudflare R2:Edit`
- **Zone Resources**: `Include - All zones` (or specific zones if preferred)
- **Account Resources**: `Include - All accounts`

### 2.3 Generate and Save Token
1. Click **Continue to summary**
2. Click **Create Token**
3. **IMPORTANT**: Copy the token immediately - you won't see it again
4. Store it securely (you'll need it for environment variables)

### 2.4 Get Account ID
1. Go back to your Cloudflare dashboard
2. In the right sidebar, you'll see **Account ID**
3. Copy this ID - you'll need it for the endpoint URL

## Step 3: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key_here
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name_here
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
```

### Getting Access Keys
You have two options for access keys:

#### Option A: Use R2 Tokens (Recommended)
1. In R2 dashboard, go to **Manage R2 API tokens**
2. Click **Create API token**
3. Set permissions to **Admin** or **Edit** for your bucket
4. Copy the **Access Key ID** and **Secret Access Key**

#### Option B: Use Account-level API Token
Use the token you created in Step 2 as both access key ID and secret (less secure, not recommended for production).

## Step 4: Update Application Code

### 4.1 Switch Storage Service
In your upload API (`src/app/api/uploads/route.ts`), change the import:

```typescript
// Change from:
import { localStorageService } from '@/services/local-storage-service';

// To:
import { storageService } from '@/services/storage-service';
```

And update the upload call:
```typescript
// Change from:
const uploadResult = await localStorageService.uploadFile(

// To:
const uploadResult = await storageService.uploadFile(
```

### 4.2 Update File Viewer
In `src/components/features/library/file-viewer.tsx`, update the URL generation:

```typescript
const getViewerUrl = () => {
  if (file.storageUrl) {
    // For R2, use the direct storage URL
    return file.storageUrl;
  }
  return `/api/downloads/files/${file.id}`;
};
```

## Step 5: Test the Setup

### 5.1 Environment Validation
Add this test endpoint to verify your R2 connection:

```typescript
// src/app/api/test-r2/route.ts
import { storageService } from '@/services/storage-service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const testBuffer = Buffer.from('Hello R2!', 'utf-8');
    const result = await storageService.uploadFile(
      'test-user',
      testBuffer,
      'test-file.txt',
      { contentType: 'text/plain' }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'R2 connection successful',
      result 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

### 5.2 Test Upload
1. Start your development server
2. Go to `/api/test-r2` to verify connection
3. Try uploading a file through the UI
4. Check your R2 bucket to confirm files are being stored

## Step 6: Production Considerations

### 6.1 Custom Domain (Optional)
To use a custom domain for your R2 bucket:
1. In R2 dashboard, go to your bucket
2. Click **Settings** tab
3. Click **Connect Domain**
4. Follow the setup wizard to connect your domain

### 6.2 CORS Configuration
If you plan to upload directly from the browser:
1. In your bucket settings, go to **CORS policy**
2. Add appropriate CORS rules:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 6.3 Security Best Practices
- Use separate buckets for development and production
- Implement bucket policies to restrict access
- Regularly rotate API tokens
- Monitor usage and costs in Cloudflare dashboard

## Troubleshooting

### Common Issues

#### SSL/TLS Errors
If you encounter SSL handshake failures:
1. Ensure your Node.js version supports modern TLS
2. Check firewall/antivirus settings
3. Try setting `NODE_TLS_REJECT_UNAUTHORIZED=0` for testing (not for production)

#### Authentication Errors
- Verify API token has correct permissions
- Check that bucket name matches exactly
- Ensure endpoint URL includes your account ID

#### Upload Failures
- Check file size limits (R2 has a 5TB object limit)
- Verify content type is set correctly
- Check bucket storage quotas

### Getting Help

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [Cloudflare Community](https://community.cloudflare.com/)

## Cost Considerations

R2 Pricing (as of 2024):
- Storage: $0.015 per GB per month
- Class A operations (writes): $4.50 per million requests
- Class B operations (reads): $0.36 per million requests
- No egress fees when accessed via Cloudflare

The free tier includes:
- 10 GB storage per month
- 1 million Class A operations per month
- 10 million Class B operations per month

## Migration from Local Storage

When ready to migrate existing uploads:

1. Create a migration script to upload existing files from `public/uploads/` to R2
2. Update database records to use R2 URLs
3. Test thoroughly in staging environment
4. Deploy to production with R2 configuration
5. Clean up local files after confirming successful migration

Remember to backup your data before migration!