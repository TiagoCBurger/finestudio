# Storage Client-Side Issue & Solution

## Problem

The current implementation has an architectural issue where `uploadFile` from `lib/upload.ts` is being imported and used directly in client-side components. This causes problems because:

1. **R2 Provider Initialization**: When `STORAGE_PROVIDER=r2`, the R2 storage provider tries to validate environment variables (which are server-only) when the module is imported in the browser.

2. **Security Risk**: Client-side code should never have direct access to storage credentials or upload logic.

3. **Error**: `StorageConfigError: R2_ACCOUNT_ID is not defined` appears in the browser console.

## Current Workaround

**Temporary Solution**: Use Supabase Storage provider which doesn't validate credentials at import time:

```bash
# In .env
STORAGE_PROVIDER=supabase
```

This works because:
- Supabase client SDK is designed to work on both client and server
- Credentials are passed through `NEXT_PUBLIC_*` environment variables
- No server-only validation happens at module import time

## Proper Solution (To Be Implemented)

### Option 1: API Route for Uploads (Recommended)

Create a Next.js API route that handles uploads server-side:

```typescript
// app/api/upload/route.ts
import { uploadFile } from '@/lib/upload';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as StorageBucket;
    
    const result = await uploadFile(file, bucket);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

Then update client components to use this API:

```typescript
// components/uploader.tsx
const uploadToServer = async (file: File, bucket: StorageBucket) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return response.json();
};
```

### Option 2: Conditional Import (Quick Fix)

Make the storage provider initialization truly lazy and only validate when actually uploading:

```typescript
// lib/storage/factory.ts
let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }
  
  // Only initialize when actually needed (server-side)
  if (typeof window !== 'undefined') {
    throw new Error('Storage provider can only be initialized on the server');
  }
  
  const providerType = (process.env.STORAGE_PROVIDER || 'r2') as StorageProviderType;
  
  // ... rest of initialization
  
  cachedProvider = provider;
  return cachedProvider;
}
```

### Option 3: Separate Client/Server Modules

Create separate modules for client and server:

```typescript
// lib/upload.client.ts - For client components
export const uploadFile = async (file: File, bucket: StorageBucket) => {
  // Call API route
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};

// lib/upload.server.ts - For server actions
export const uploadFile = async (file: File, bucket: StorageBucket) => {
  // Direct storage provider access
  const storage = getStorageProvider();
  return storage.upload(/* ... */);
};
```

## Recommended Approach

**Option 1 (API Route)** is the most secure and scalable solution because:

1. ✅ Complete separation of client and server concerns
2. ✅ No risk of exposing server credentials
3. ✅ Works with any storage provider
4. ✅ Easy to add rate limiting, validation, etc.
5. ✅ Standard Next.js pattern

## Implementation Steps

1. Create `/app/api/upload/route.ts` with POST handler
2. Update all client components to use the API route
3. Keep `lib/upload.ts` for server-side use only (server actions)
4. Add proper error handling and validation in the API route
5. Add authentication checks in the API route
6. Test with both R2 and Supabase providers

## Files That Need Updates

### Client Components (use API route):
- `components/uploader.tsx`
- `components/profile.tsx`
- `components/canvas.tsx`
- `components/nodes/image/primitive.tsx`
- `components/nodes/file/primitive.tsx`
- `components/nodes/audio/primitive.tsx`
- `components/nodes/video/primitive.tsx`
- `providers/node-dropzone.tsx`

### Server Actions (keep using lib/upload.ts):
- `app/actions/image/create.ts`
- `app/actions/video/create.ts`

## Testing Checklist

After implementing the proper solution:

- [ ] Client components can upload files
- [ ] Server actions can upload files
- [ ] R2 provider works without browser errors
- [ ] Supabase provider still works
- [ ] No server credentials exposed to client
- [ ] Proper error messages for users
- [ ] Authentication is enforced
- [ ] File validation works

## Current Status

- ✅ Lazy initialization implemented in R2 provider
- ✅ Server-side check added to R2 provider
- ⚠️ Temporary workaround: Using Supabase provider
- ❌ Proper API route not yet implemented
- ❌ Client components still import server-only code

## Next Steps

1. Implement API route for uploads (Option 1)
2. Update all client components to use API route
3. Test with R2 provider
4. Update documentation
5. Remove temporary workaround
