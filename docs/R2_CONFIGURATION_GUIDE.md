# Cloudflare R2 Configuration Guide

## Problem: Image Optimization Timeouts

When using R2 signed URLs with Next.js image optimization, you may encounter:
- Image loading failures after 7 days (signed URL expiration)
- Next.js optimization timeouts
- Need to disable optimization (`unoptimized: true`)

## Solution: Configure R2 Public Access

### Step 1: Enable Public Access on R2 Bucket

1. Go to Cloudflare Dashboard > R2
2. Select your bucket
3. Go to Settings > Public Access
4. Click "Allow Access" and confirm

### Step 2: Configure Custom Domain (Recommended)

1. In R2 bucket settings, go to "Custom Domains"
2. Click "Connect Domain"
3. Enter your domain (e.g., `cdn.yourdomain.com`)
4. Add the CNAME record to your DNS:
   ```
   cdn.yourdomain.com CNAME <bucket-name>.<account-id>.r2.cloudflarestorage.com
   ```

### Step 3: Update Environment Variables

```bash
# .env
R2_PUBLIC_URL=https://cdn.yourdomain.com
```

### Step 4: Update Next.js Image Configuration

```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'cdn.yourdomain.com', // Your R2 custom domain
    },
  ],
  unoptimized: false, // Enable optimization
  minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year (permanent URLs)
}
```

## Alternative: Keep Signed URLs with Refresh

If you can't enable public access, implement URL refresh:

1. Store original file paths in database
2. Regenerate signed URLs on-demand
3. Implement middleware to refresh expired URLs

See `lib/storage/url-refresh.ts` for implementation details.

## Benefits of Public Access + Custom Domain

✅ Permanent URLs (no expiration)
✅ Next.js image optimization works perfectly
✅ Better performance (CDN caching)
✅ Lower bandwidth costs (optimized images)
✅ Automatic WebP/AVIF conversion
✅ Responsive image srcsets

## Security Considerations

- R2 public access only allows READ operations
- Upload/delete still requires API keys
- Use RLS policies to control who can upload
- Consider adding Cloudflare Access for additional protection
