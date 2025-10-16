# Quick Fix Guide

## Current Issues & Solutions

### 1. ✅ FIXED: Next.js Image Error
**Error**: `hostname "my-bucket.r2.cloudflarestorage.com" is not configured`

**Solution**: Added R2 hostname to `next.config.ts`
```typescript
{
  protocol: 'https',
  hostname: '*.r2.cloudflarestorage.com',
}
```

**Action Required**: Restart development server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### 2. 🔍 INVESTIGATING: 401 Authentication Error
**Error**: `You need to be logged in to upload a file!`

**Added Debug Logs**: Check your terminal for these logs:
```
[Upload API] Request received
[Upload API] File: xxx Bucket: xxx
[Upload Server] Creating Supabase client...
[Upload Server] Getting user...
[Upload Server] Auth result: { hasUser: xxx, userId: xxx, error: xxx }
```

**Possible Causes**:
1. Not logged in to the application
2. Session expired
3. Cookies not being sent

**Quick Checks**:

#### A. Verify You're Logged In
1. Open browser DevTools → Application → Cookies
2. Look for Supabase auth cookies:
   - `sb-<project>-auth-token`
   - `sb-<project>-auth-token-code-verifier`
3. If missing → Log out and log in again

#### B. Check Terminal Logs
After trying to upload, check terminal for:
```
[Upload Server] Auth result: { hasUser: false, ... }
```

If `hasUser: false`, the session is not being read correctly.

#### C. Try Logging Out and In
1. Click profile menu
2. Log out
3. Log in again
4. Try upload again

### 3. ⚠️ Missing OPENAI_API_KEY
**Error**: `The OPENAI_API_KEY environment variable is missing`

This error appears when trying to generate image descriptions using OpenAI's vision model.

**Solutions**:

#### Option A: Add OpenAI Key (Recommended)
```bash
# Add to .env
OPENAI_API_KEY=sk-your_openai_api_key
```

#### Option B: Disable Vision Description (Temporary)
Comment out the vision description code in `app/actions/image/create.ts`

### 4. 🔄 Using Supabase Storage (Current)
Your `.env` is set to use Supabase:
```bash
STORAGE_PROVIDER=supabase
```

This is correct for now since R2 has permission issues.

**To switch to R2 later**:
1. Fix R2 API token permissions (see `R2_PERMISSIONS_FIX.md`)
2. Change `.env`: `STORAGE_PROVIDER=r2`
3. Restart server

## Debugging Steps

### Step 1: Check Authentication
```bash
# In browser console
document.cookie
# Should see Supabase auth cookies
```

### Step 2: Check Server Logs
Look for these patterns in terminal:
```
✅ Good: [Upload Server] User authenticated: <user-id>
❌ Bad: [Upload Server] No user found - throwing auth error
```

### Step 3: Test Upload
1. Log in to application
2. Add image node
3. Try to upload image
4. Check terminal logs
5. Check browser console

### Step 4: Verify Environment
```bash
# Check .env is loaded
node -e "console.log({
  storage: process.env.STORAGE_PROVIDER,
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})"
```

## Common Solutions

### Solution 1: Clear Cookies and Re-login
```
1. Open DevTools → Application → Cookies
2. Delete all Supabase cookies
3. Refresh page
4. Log in again
5. Try upload
```

### Solution 2: Restart Everything
```bash
# Stop server
Ctrl+C

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Solution 3: Check Middleware
Verify you have middleware that refreshes auth:
```typescript
// middleware.ts should handle auth refresh
```

## Expected Behavior

### Successful Upload Flow
```
1. User clicks upload
2. [Upload API] Request received
3. [Upload Server] Creating Supabase client...
4. [Upload Server] Getting user...
5. [Upload Server] Auth result: { hasUser: true, userId: "xxx" }
6. [Upload Server] User authenticated: xxx
7. File uploads successfully
8. Returns public URL
```

### Failed Upload Flow (Auth Issue)
```
1. User clicks upload
2. [Upload API] Request received
3. [Upload Server] Creating Supabase client...
4. [Upload Server] Getting user...
5. [Upload Server] Auth result: { hasUser: false, error: "..." }
6. [Upload Server] No user found - throwing auth error
7. Returns 401 error
```

## Next Steps

1. **Restart server** (required for next.config.ts changes)
2. **Log in** to the application
3. **Try upload** and watch terminal logs
4. **Share logs** if still having issues

## Files Modified

- ✅ `next.config.ts` - Added R2 hostname
- ✅ `lib/upload.server.ts` - Added debug logs
- ✅ `app/api/upload/route.ts` - Added debug logs

## Status

- ✅ Next.js image error - FIXED
- 🔍 Auth error - INVESTIGATING (added logs)
- ⚠️ OpenAI key - OPTIONAL (can be added later)
- ✅ R2 permissions - DOCUMENTED (use Supabase for now)

---

**Action Required**: Restart server and try upload again while watching terminal logs
