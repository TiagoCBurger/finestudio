# Storage Abstraction Layer

This directory contains the storage abstraction layer that allows seamless switching between different storage backends (R2, Supabase) without code changes.

## Architecture

```
lib/storage/
├── types.ts          # Common interfaces and types
├── factory.ts        # Provider selection logic
├── r2.ts            # Cloudflare R2 implementation
├── supabase.ts      # Supabase Storage implementation
├── errors.ts        # Custom error classes
├── health-check.ts  # Configuration validation
└── url-refresh.ts   # URL refresh utilities (if needed)
```

## Configuration

### Using Cloudflare R2 (Recommended)

```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # Optional but recommended
```

**Important**: Without `R2_PUBLIC_URL`, signed URLs will be generated that expire after 7 days, causing "Failed to load image" errors. For production:
1. Enable public access on your R2 bucket in Cloudflare Dashboard
2. Set `R2_PUBLIC_URL` to your public domain or R2.dev URL

### Using Supabase Storage (Fallback)

```env
STORAGE_PROVIDER=supabase
# Uses existing Supabase configuration
```

## Usage

### Server-Side Upload

```typescript
import { uploadFile } from '@/lib/upload.server';

const result = await uploadFile(file, 'files');
console.log('Uploaded to:', result.url);
```

### Client-Side Upload

```typescript
import { uploadFile } from '@/lib/upload.client';

const result = await uploadFile(file, 'files');
console.log('Uploaded to:', result.url);
```

### Direct Provider Access

```typescript
import { getStorageProvider } from '@/lib/storage/factory';

const storage = getStorageProvider();
const result = await storage.upload(userId, 'files', filename, file, {
    contentType: 'image/png',
    upsert: false,
});
```

## Storage Buckets

- **avatars**: User profile pictures
- **files**: General user-uploaded files (images, videos, audio)
- **screenshots**: Project screenshots (supports upsert)

## Error Handling

The abstraction provides custom error classes:

- `StorageConfigError`: Configuration issues (missing env vars)
- `StorageAuthError`: Authentication failures
- `StorageUploadError`: Upload failures

```typescript
import { StorageConfigError, StorageUploadError } from '@/lib/storage/errors';

try {
    await uploadFile(file, 'files');
} catch (error) {
    if (error instanceof StorageConfigError) {
        // Handle configuration error
    } else if (error instanceof StorageUploadError) {
        // Handle upload error
    }
}
```

## Health Check

Validate storage configuration:

```typescript
import { checkStorageHealth, getStorageStatusMessage } from '@/lib/storage/health-check';

const health = await checkStorageHealth();
console.log(getStorageStatusMessage(health));
```

## Migration Guide

### From Supabase to R2

1. Configure R2 environment variables
2. Set `STORAGE_PROVIDER=r2`
3. Restart your application
4. Existing Supabase URLs will continue to work
5. New uploads will use R2

### From R2 to Supabase

1. Set `STORAGE_PROVIDER=supabase`
2. Restart your application
3. Existing R2 URLs will continue to work
4. New uploads will use Supabase

## Troubleshooting

### "Failed to load image" errors

**Cause**: R2 signed URLs expired (7-day limit)

**Solutions**:
1. Configure `R2_PUBLIC_URL` (recommended)
2. Enable public access on R2 bucket
3. Switch to Supabase: `STORAGE_PROVIDER=supabase`

### "Storage not configured" errors

**Cause**: Missing environment variables

**Solution**: Run health check to identify missing variables:
```bash
node -e "require('./lib/storage/health-check').checkStorageHealth().then(console.log)"
```

### Upload timeouts

**Cause**: Large files or slow network

**Solutions**:
1. Increase timeout in R2 client configuration
2. Implement chunked uploads for large files
3. Use client-side upload with progress tracking

## Best Practices

1. **Always use the abstraction layer** - Don't import R2 or Supabase providers directly
2. **Configure R2_PUBLIC_URL** - Avoid signed URL expiration issues
3. **Validate file types** - Use the allowed types in `upload.server.ts`
4. **Handle errors gracefully** - Use custom error classes for specific handling
5. **Test configuration** - Use health check before deployment

## Performance Considerations

- **R2**: Lower latency for global users, no egress fees
- **Supabase**: Integrated with existing auth, simpler setup
- **Signed URLs**: Add ~50ms overhead for generation
- **Public URLs**: No overhead, instant access

## Security

- All uploads require authentication
- RLS policies control access (Supabase only)
- File type validation prevents malicious uploads
- Size limits prevent abuse (100MB default)
