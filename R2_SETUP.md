# Cloudflare R2 Storage Setup Guide

This guide walks you through setting up Cloudflare R2 as your storage provider for this application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Create R2 Bucket](#step-1-create-r2-bucket)
- [Step 2: Generate API Tokens](#step-2-generate-api-tokens)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Optional - Setup Custom Domain](#step-4-optional---setup-custom-domain)
- [Step 5: Verify Configuration](#step-5-verify-configuration)
- [Migration from Supabase Storage](#migration-from-supabase-storage)
- [Troubleshooting](#troubleshooting)

## Overview

Cloudflare R2 is an S3-compatible object storage service that offers:

- **No egress fees** - Free data transfer out
- **Competitive pricing** - $0.015/GB/month for storage
- **Global CDN** - Fast access worldwide
- **No file size limits** - Unlike Supabase's 10MB limit
- **S3 compatibility** - Works with existing S3 tools

This application uses R2 as the default storage provider for user-generated content including images, videos, and audio files.

## Prerequisites

- A Cloudflare account (free tier available)
- Access to your application's environment variables
- Basic understanding of environment configuration

## Step 1: Create R2 Bucket

1. **Log in to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to **R2** in the left sidebar

2. **Create a New Bucket**
   - Click **Create bucket**
   - Enter a bucket name (e.g., `my-app-storage`)
   - Choose a location hint (optional, for performance optimization)
   - Click **Create bucket**

3. **Configure Bucket Settings**
   - Navigate to your newly created bucket
   - Go to **Settings** tab
   - Under **Public Access**, enable **Allow Access**
   - This allows files to be accessed via public URLs

4. **Note Your Account ID**
   - In the R2 overview page, you'll see your **Account ID**
   - Copy this value - you'll need it for configuration

## Step 2: Generate API Tokens

1. **Navigate to API Tokens**
   - In the R2 section, click **Manage R2 API Tokens**
   - Or go to **My Profile** → **API Tokens** → **R2 API Tokens**

2. **Create API Token**
   - Click **Create API Token**
   - Give it a descriptive name (e.g., `my-app-r2-access`)

3. **Set Permissions**
   - **Permissions**: Select **Object Read & Write**
   - **Bucket**: Choose the bucket you created (or select "All buckets")
   - **TTL**: Leave as default or set an expiration if needed

4. **Generate and Save Credentials**
   - Click **Create API Token**
   - You'll see three values:
     - **Access Key ID** - Copy this
     - **Secret Access Key** - Copy this (shown only once!)
     - **Endpoint** - Note the account ID in the endpoint URL
   - Store these securely - you won't be able to see the secret again

## Step 3: Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# Storage Provider Configuration
STORAGE_PROVIDER=r2

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=my-app-storage
```

### Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STORAGE_PROVIDER` | No | Storage provider to use (`r2` or `supabase`) | `r2` (default) |
| `R2_ACCOUNT_ID` | Yes* | Your Cloudflare account ID | `abc123def456` |
| `R2_ACCESS_KEY_ID` | Yes* | R2 API token access key ID | `a1b2c3d4e5f6` |
| `R2_SECRET_ACCESS_KEY` | Yes* | R2 API token secret key | `secretkey123` |
| `R2_BUCKET_NAME` | Yes* | Name of your R2 bucket | `my-app-storage` |
| `R2_PUBLIC_URL` | No | Custom domain for public URLs | `https://cdn.example.com` |

*Required only when `STORAGE_PROVIDER=r2`

## Step 4: Optional - Setup Custom Domain

Using a custom domain provides better URLs and easier future migrations.

### Benefits of Custom Domain

- **Branded URLs**: `https://cdn.yourdomain.com/file.jpg` instead of `https://bucket.r2.cloudflarestorage.com/file.jpg`
- **Better caching**: More control over CDN behavior
- **Easier migration**: Change backend without changing URLs
- **Professional appearance**: Cleaner URLs for users

### Setup Steps

1. **Add Custom Domain in Cloudflare**
   - Go to your R2 bucket in the dashboard
   - Click **Settings** tab
   - Under **Custom Domains**, click **Connect Domain**
   - Enter your domain (e.g., `cdn.yourdomain.com`)
   - Click **Continue**

2. **Configure DNS**
   - Cloudflare will automatically create a CNAME record
   - If your domain is not on Cloudflare, manually create:
     - Type: `CNAME`
     - Name: `cdn` (or your subdomain)
     - Target: `<bucket-name>.<account-id>.r2.cloudflarestorage.com`

3. **Update Environment Variable**
   ```bash
   R2_PUBLIC_URL=https://cdn.yourdomain.com
   ```

4. **Verify**
   - Wait for DNS propagation (usually a few minutes)
   - Test by uploading a file and checking the returned URL

## Step 5: Verify Configuration

1. **Restart Your Application**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

2. **Test File Upload**
   - Log in to your application
   - Try uploading an image, video, or audio file
   - Verify the file is accessible via the returned URL

3. **Check R2 Dashboard**
   - Go to your R2 bucket in Cloudflare dashboard
   - Navigate to the **Objects** tab
   - You should see your uploaded files organized by bucket and user ID:
     ```
     avatars/
       user-id-123/
         filename.jpg
     files/
       user-id-123/
         filename.mp4
     screenshots/
       user-id-123/
         filename.png
     ```

## Migration from Supabase Storage

If you're currently using Supabase Storage and want to migrate to R2:

### Option 1: Gradual Migration (Recommended)

This approach keeps existing files in Supabase while new uploads go to R2.

1. **Setup R2** (follow steps above)

2. **Configure Environment**
   ```bash
   STORAGE_PROVIDER=r2
   # Add R2 credentials
   ```

3. **Deploy Changes**
   - All new uploads will go to R2
   - Existing Supabase URLs continue to work
   - No data migration needed immediately

4. **Optional: Migrate Existing Files**
   - Use a script to copy files from Supabase to R2
   - Update database records with new URLs
   - This can be done gradually over time

### Option 2: Full Migration

This approach migrates all existing files to R2.

1. **Setup R2** (follow steps above)

2. **Export Files from Supabase**
   ```bash
   # Use Supabase CLI or API to download all files
   # Organize by bucket structure
   ```

3. **Upload to R2**
   ```bash
   # Use AWS CLI or custom script to upload
   aws s3 sync ./local-files s3://your-bucket-name \
     --endpoint-url https://your-account-id.r2.cloudflarestorage.com
   ```

4. **Update Database Records**
   - Update all file URL references in your database
   - Replace Supabase URLs with R2 URLs

5. **Switch Provider**
   ```bash
   STORAGE_PROVIDER=r2
   ```

6. **Verify and Deploy**
   - Test thoroughly in staging
   - Deploy to production

### Migration Script Example

```typescript
// scripts/migrate-to-r2.ts
import { createClient } from '@supabase/supabase-js';
import { r2Storage } from '@/lib/storage/r2';

async function migrateFiles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all file records from your database
  const { data: files } = await supabase
    .from('files')
    .select('*');

  for (const file of files) {
    try {
      // Download from Supabase
      const { data } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (!data) continue;

      // Upload to R2
      const buffer = Buffer.from(await data.arrayBuffer());
      const result = await r2Storage.upload(
        file.user_id,
        file.bucket,
        file.filename,
        buffer,
        { contentType: file.content_type }
      );

      // Update database record
      await supabase
        .from('files')
        .update({ url: result.url })
        .eq('id', file.id);

      console.log(`Migrated: ${file.filename}`);
    } catch (error) {
      console.error(`Failed to migrate ${file.filename}:`, error);
    }
  }
}

migrateFiles();
```

## Troubleshooting

### Issue: "R2_ACCOUNT_ID is not defined"

**Cause**: Missing or incorrect environment variable configuration.

**Solution**:
1. Verify `.env` file contains all required R2 variables
2. Restart your development server after adding variables
3. Check for typos in variable names
4. Ensure `.env` file is in the project root

### Issue: "Access Denied" or "403 Forbidden"

**Cause**: Incorrect API token permissions or bucket access settings.

**Solution**:
1. Verify API token has **Object Read & Write** permissions
2. Check that the token is scoped to the correct bucket
3. Ensure bucket has **Public Access** enabled
4. Regenerate API token if needed

### Issue: "Bucket not found"

**Cause**: Incorrect bucket name or bucket doesn't exist.

**Solution**:
1. Verify `R2_BUCKET_NAME` matches exactly (case-sensitive)
2. Check bucket exists in Cloudflare dashboard
3. Ensure you're using the correct Cloudflare account

### Issue: Files upload but URLs don't work

**Cause**: Bucket public access not enabled or incorrect URL generation.

**Solution**:
1. Enable **Public Access** in bucket settings
2. If using custom domain, verify DNS is configured correctly
3. Check `R2_PUBLIC_URL` format (should include `https://`)
4. Test URL directly in browser to see specific error

### Issue: "Network timeout" or slow uploads

**Cause**: Network issues or large file sizes.

**Solution**:
1. Check your internet connection
2. Verify firewall isn't blocking Cloudflare endpoints
3. For large files, consider implementing chunked uploads
4. Check Cloudflare status page for service issues

### Issue: Custom domain not working

**Cause**: DNS not propagated or misconfigured.

**Solution**:
1. Wait 5-10 minutes for DNS propagation
2. Verify CNAME record is correct using `dig` or `nslookup`:
   ```bash
   dig cdn.yourdomain.com
   ```
3. Ensure domain is connected in R2 bucket settings
4. Check SSL certificate is active (Cloudflare handles this automatically)

### Issue: "Invalid credentials"

**Cause**: Incorrect or expired API token.

**Solution**:
1. Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are correct
2. Check for extra spaces or newlines in `.env` file
3. Regenerate API token if it was rotated or expired
4. Ensure you copied the full secret key (it's long!)

### Issue: Files organized incorrectly

**Cause**: Bucket structure mismatch.

**Solution**:
1. Files are automatically organized as: `{bucket}/{userId}/{filename}`
2. Verify bucket names match: `avatars`, `files`, `screenshots`
3. Check that userId is being passed correctly
4. Review upload logs for path information

### Debugging Tips

1. **Enable Detailed Logging**
   ```typescript
   // Add to your upload function temporarily
   console.log('Upload params:', {
     bucket,
     userId,
     filename,
     contentType
   });
   ```

2. **Test with AWS CLI**
   ```bash
   # Verify credentials work
   aws s3 ls s3://your-bucket-name \
     --endpoint-url https://your-account-id.r2.cloudflarestorage.com \
     --profile r2
   ```

3. **Check Cloudflare Logs**
   - Go to R2 bucket → **Metrics** tab
   - Review request logs and error rates

4. **Verify Environment Variables**
   ```bash
   # In your terminal
   echo $R2_ACCOUNT_ID
   echo $R2_BUCKET_NAME
   ```

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

## Support

If you encounter issues not covered in this guide:

1. Check the [Cloudflare Community](https://community.cloudflare.com/)
2. Review [R2 Known Issues](https://developers.cloudflare.com/r2/platform/known-issues/)
3. Contact Cloudflare support through your dashboard

## Security Best Practices

1. **Never commit credentials** - Keep `.env` in `.gitignore`
2. **Use environment-specific tokens** - Different tokens for dev/staging/prod
3. **Rotate tokens regularly** - Generate new tokens periodically
4. **Limit token scope** - Only grant necessary permissions
5. **Monitor usage** - Check R2 metrics for unusual activity
6. **Enable audit logs** - Track API token usage in Cloudflare

## Performance Optimization

1. **Use custom domain with CDN** - Better caching and performance
2. **Implement client-side caching** - Cache-Control headers
3. **Optimize file sizes** - Compress images/videos before upload
4. **Use appropriate content types** - Ensures proper browser handling
5. **Consider geographic location** - Choose bucket location near users

---

**Last Updated**: January 2025
**Version**: 1.0.0
