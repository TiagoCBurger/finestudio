# R2 Permissions Configuration Guide

## Problem

Files are not uploading to R2 due to permission issues. This typically happens when:
1. The R2 API token doesn't have the correct permissions
2. The bucket doesn't exist
3. The bucket has incorrect access policies

## Solution Steps

### 1. Verify R2 API Token Permissions

Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens

Your API token needs these permissions:
- ✅ **Object Read & Write** - Required for uploading files
- ✅ **Bucket Read** - Required to verify bucket exists

#### Create New Token (if needed)

1. Click "Create API Token"
2. Select permissions:
   - **Object Read & Write** ✅
   - **Bucket Read** ✅
3. Select scope:
   - **Apply to specific buckets only** (recommended)
   - Select your bucket: `my-bucket`
4. Click "Create API Token"
5. Copy the credentials:
   - Access Key ID
   - Secret Access Key
6. Update `.env`:
   ```bash
   R2_ACCESS_KEY_ID=your_new_access_key_id
   R2_SECRET_ACCESS_KEY=your_new_secret_access_key
   ```

### 2. Verify Bucket Exists

Go to Cloudflare Dashboard → R2 → Overview

Check if bucket `my-bucket` exists:
- ✅ If exists, continue to step 3
- ❌ If not, create it:
  1. Click "Create bucket"
  2. Name: `my-bucket` (or update `R2_BUCKET_NAME` in `.env`)
  3. Location: Choose closest to your users
  4. Click "Create bucket"

### 3. Configure Bucket Public Access

For files to be accessible via public URLs, configure public access:

#### Option A: Public Bucket (Recommended for Development)

1. Go to your bucket → Settings
2. Scroll to "Public access"
3. Click "Allow Access"
4. Confirm

**Note**: This makes all files in the bucket publicly accessible via URL.

#### Option B: Custom Domain with Public Access

1. Go to your bucket → Settings
2. Click "Connect Domain"
3. Enter your domain: `cdn.yourdomain.com`
4. Follow DNS configuration steps
5. Enable "Public Access"
6. Update `.env`:
   ```bash
   R2_PUBLIC_URL=https://cdn.yourdomain.com
   ```

### 4. Test R2 Connection

Create a test script to verify R2 is working:

```bash
# Create test file
cat > test-r2-upload.js << 'EOF'
const { S3Client, PutObjectCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function testR2() {
  try {
    console.log('Testing R2 connection...');
    
    // Test 1: List buckets
    console.log('\n1. Listing buckets...');
    const listCommand = new ListBucketsCommand({});
    const buckets = await client.send(listCommand);
    console.log('✅ Buckets:', buckets.Buckets?.map(b => b.Name));
    
    // Test 2: Upload test file
    console.log('\n2. Uploading test file...');
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'test/test-file.txt',
      Body: Buffer.from('Hello from R2!'),
      ContentType: 'text/plain',
    });
    await client.send(uploadCommand);
    console.log('✅ Upload successful!');
    
    // Test 3: Generate URL
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/test/test-file.txt`
      : `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/test/test-file.txt`;
    console.log('\n3. Public URL:', publicUrl);
    console.log('✅ Try accessing this URL in your browser');
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.Code) {
      console.error('Error Code:', error.Code);
    }
  }
}

testR2();
EOF

# Run test
node test-r2-upload.js
```

### 5. Common Error Messages

#### "NoSuchBucket"
**Problem**: Bucket doesn't exist
**Solution**: Create bucket in Cloudflare dashboard or update `R2_BUCKET_NAME`

#### "InvalidAccessKeyId"
**Problem**: Access Key ID is incorrect
**Solution**: Verify `R2_ACCESS_KEY_ID` in `.env` matches Cloudflare dashboard

#### "SignatureDoesNotMatch"
**Problem**: Secret Access Key is incorrect
**Solution**: Verify `R2_SECRET_ACCESS_KEY` in `.env` matches Cloudflare dashboard

#### "AccessDenied"
**Problem**: API token doesn't have required permissions
**Solution**: Create new token with "Object Read & Write" permissions

#### "AccountProblem"
**Problem**: R2 Account ID is incorrect
**Solution**: Verify `R2_ACCOUNT_ID` in `.env` matches Cloudflare dashboard

### 6. Verify Environment Variables

Double-check your `.env` file:

```bash
# Required
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id          # From Cloudflare Dashboard
R2_ACCESS_KEY_ID=your_access_key       # From API Token
R2_SECRET_ACCESS_KEY=your_secret_key   # From API Token
R2_BUCKET_NAME=my-bucket               # Your bucket name

# Optional (for custom domain)
R2_PUBLIC_URL=https://cdn.yourdomain.com
```

**Important**: After updating `.env`, restart your development server!

```bash
# Stop server (Ctrl+C)
npm run dev
```

## Temporary Workaround: Use Supabase

While configuring R2, you can temporarily use Supabase Storage:

```bash
# In .env
STORAGE_PROVIDER=supabase
```

This will work immediately with your existing Supabase configuration.

## Verification Checklist

- [ ] R2 API token has "Object Read & Write" permission
- [ ] R2 API token has "Bucket Read" permission
- [ ] Bucket exists in Cloudflare dashboard
- [ ] Bucket has public access enabled
- [ ] All environment variables are correct
- [ ] Development server restarted after .env changes
- [ ] Test script runs successfully
- [ ] Can access test file URL in browser

## Next Steps After Fixing

1. Restart development server
2. Try uploading a file in the app
3. Check Cloudflare R2 dashboard - file should appear
4. Verify file URL is accessible
5. Test image/video generation

## Support Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Tokens](https://developers.cloudflare.com/r2/api/s3/tokens/)
- [R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 Custom Domains](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains)

## Quick Fix Commands

```bash
# 1. Verify environment variables are loaded
node -e "console.log({
  provider: process.env.STORAGE_PROVIDER,
  accountId: process.env.R2_ACCOUNT_ID?.substring(0, 8) + '...',
  hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET_NAME
})"

# 2. Test R2 connection
node test-r2-upload.js

# 3. Switch to Supabase temporarily (if R2 not working)
# Edit .env: STORAGE_PROVIDER=supabase
# Then restart: npm run dev
```

---

**Most Common Issue**: API token doesn't have "Object Read & Write" permission. Create a new token with correct permissions!
