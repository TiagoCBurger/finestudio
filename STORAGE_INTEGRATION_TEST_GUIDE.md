# Storage Integration Testing Guide

This guide provides step-by-step instructions for manually testing the storage integration to ensure everything works correctly with both R2 and Supabase Storage providers.

## Prerequisites

- Development environment set up
- Supabase project configured
- (Optional) Cloudflare R2 bucket configured

## Test 1: Verify Default Configuration (Supabase)

### Setup
1. Ensure `.env` has Supabase credentials configured
2. Ensure `STORAGE_PROVIDER` is NOT set (or set to `supabase`)

```bash
# .env
STORAGE_PROVIDER=supabase
# ... other Supabase variables
```

### Test Steps

#### 1.1 Test Image Upload via Component
1. Start the development server: `npm run dev`
2. Navigate to a project
3. Add an image node
4. Upload an image file
5. **Expected Result**: Image uploads successfully and displays
6. **Verify**: Check Supabase Storage dashboard - file should be in `files` bucket

#### 1.2 Test Image Generation
1. Add a text node with a prompt
2. Connect it to an image transform node
3. Generate an image
4. **Expected Result**: Image generates and displays
5. **Verify**: Check Supabase Storage dashboard - generated image should be in `files` bucket

#### 1.3 Test Video Generation
1. Add an image node
2. Connect it to a video transform node
3. Generate a video
4. **Expected Result**: Video generates and displays
5. **Verify**: Check Supabase Storage dashboard - generated video should be in `files` bucket

#### 1.4 Test Avatar Upload
1. Click on profile menu
2. Upload a new avatar
3. **Expected Result**: Avatar uploads and displays
4. **Verify**: Check Supabase Storage dashboard - avatar should be in `avatars` bucket

## Test 2: Switch to R2 Provider

### Setup
1. Configure R2 credentials in `.env`:

```bash
# .env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-custom-domain.com  # Optional
```

2. Restart the development server

### Test Steps

#### 2.1 Test Image Upload via Component
1. Navigate to a project
2. Add an image node
3. Upload an image file
4. **Expected Result**: Image uploads successfully and displays
5. **Verify**: Check R2 dashboard - file should be in bucket under `files/{userId}/` path

#### 2.2 Test Image Generation
1. Add a text node with a prompt
2. Connect it to an image transform node
3. Generate an image
4. **Expected Result**: Image generates and displays
5. **Verify**: Check R2 dashboard - generated image should be in bucket under `files/{userId}/` path

#### 2.3 Test Video Generation
1. Add an image node
2. Connect it to a video transform node
3. Generate a video
4. **Expected Result**: Video generates and displays
5. **Verify**: Check R2 dashboard - generated video should be in bucket under `files/{userId}/` path

#### 2.4 Test Avatar Upload
1. Click on profile menu
2. Upload a new avatar
3. **Expected Result**: Avatar uploads and displays
4. **Verify**: Check R2 dashboard - avatar should be in bucket under `avatars/{userId}/` path

## Test 3: Error Handling

### 3.1 Test Missing Configuration
1. Set `STORAGE_PROVIDER=r2` but remove R2 credentials
2. Restart server
3. Try to upload a file
4. **Expected Result**: Clear error message about missing R2 configuration
5. **Error Message Should Include**: Which environment variable is missing

### 3.2 Test Invalid Credentials
1. Set `STORAGE_PROVIDER=r2` with invalid credentials
2. Restart server
3. Try to upload a file
4. **Expected Result**: Clear error message about authentication failure
5. **Error Message Should Include**: Indication that credentials are invalid

### 3.3 Test File Size Limit
1. Try to upload a file larger than 100MB
2. **Expected Result**: Clear error message about file size
3. **Error Message Should Include**: 
   - Maximum allowed size (100MB)
   - Actual file size

### 3.4 Test Invalid File Type
1. Try to upload a `.txt` file to the `avatars` bucket
2. **Expected Result**: Clear error message about file type
3. **Error Message Should Include**:
   - The rejected file type
   - List of allowed file types for that bucket

### 3.5 Test Unauthenticated Upload
1. Log out of the application
2. Try to access an upload endpoint directly
3. **Expected Result**: Clear error message about authentication
4. **Error Message Should Include**: "You need to be logged in to upload a file!"

## Test 4: Provider Switching

### 4.1 Test Seamless Switching
1. Upload files with `STORAGE_PROVIDER=supabase`
2. Change to `STORAGE_PROVIDER=r2` and restart
3. Upload new files
4. **Expected Result**: 
   - Old files (from Supabase) still accessible
   - New files upload to R2
   - No code changes needed
   - Application works normally

### 4.2 Test Default Behavior
1. Remove `STORAGE_PROVIDER` from `.env`
2. Restart server
3. Upload a file
4. **Expected Result**: File uploads to R2 (default provider)

## Test 5: URL Generation

### 5.1 Test R2 with Custom Domain
1. Set `R2_PUBLIC_URL=https://cdn.yourdomain.com`
2. Upload a file
3. **Expected Result**: File URL uses custom domain
4. **URL Format**: `https://cdn.yourdomain.com/files/{userId}/{filename}`

### 5.2 Test R2 without Custom Domain
1. Remove `R2_PUBLIC_URL` from `.env`
2. Upload a file
3. **Expected Result**: File URL uses R2 default endpoint
4. **URL Format**: `https://{bucket}.r2.cloudflarestorage.com/files/{userId}/{filename}`

### 5.3 Test Supabase URLs
1. Set `STORAGE_PROVIDER=supabase`
2. Upload a file
3. **Expected Result**: File URL uses Supabase public URL
4. **URL Format**: `https://{project}.supabase.co/storage/v1/object/public/files/{userId}/{filename}`

## Test 6: Bucket Organization

### 6.1 Verify File Organization
1. Upload files to different buckets:
   - Avatar image → `avatars` bucket
   - Regular file → `files` bucket
   - Screenshot → `screenshots` bucket

2. **Expected Result**: Files organized correctly in storage
3. **Path Structure**:
   - Avatars: `avatars/{userId}/{filename}`
   - Files: `files/{userId}/{filename}`
   - Screenshots: `screenshots/{userId}/{filename}`

### 6.2 Test Screenshot Upsert
1. Upload a screenshot with filename `test.png`
2. Upload another screenshot with the same filename `test.png`
3. **Expected Result**: Second upload overwrites the first (upsert behavior)
4. **Verify**: Only one `test.png` exists in storage

## Test 7: Performance

### 7.1 Test Large File Upload
1. Upload a large video file (close to 100MB)
2. **Expected Result**: 
   - Upload completes successfully
   - No timeout errors
   - File is accessible

### 7.2 Test Concurrent Uploads
1. Upload multiple files simultaneously
2. **Expected Result**:
   - All uploads complete successfully
   - No race conditions
   - All files accessible

## Checklist

Use this checklist to track your testing progress:

### Supabase Provider
- [ ] Image upload via component works
- [ ] Image generation works
- [ ] Video generation works
- [ ] Avatar upload works
- [ ] Files appear in correct Supabase buckets
- [ ] URLs are accessible

### R2 Provider
- [ ] Image upload via component works
- [ ] Image generation works
- [ ] Video generation works
- [ ] Avatar upload works
- [ ] Files appear in correct R2 paths
- [ ] URLs are accessible
- [ ] Custom domain URLs work (if configured)

### Error Handling
- [ ] Missing configuration error is clear
- [ ] Invalid credentials error is clear
- [ ] File size limit error is clear
- [ ] Invalid file type error is clear
- [ ] Unauthenticated upload error is clear

### Provider Switching
- [ ] Can switch from Supabase to R2
- [ ] Can switch from R2 to Supabase
- [ ] Default provider is R2
- [ ] No code changes needed when switching

### Bucket Organization
- [ ] Files organized by bucket and userId
- [ ] Screenshot upsert behavior works
- [ ] File paths are correct

### Performance
- [ ] Large files upload successfully
- [ ] Concurrent uploads work correctly

## Troubleshooting

### Issue: Files not uploading
**Check:**
- Environment variables are set correctly
- Server has been restarted after env changes
- User is authenticated
- File size is under 100MB
- File type is allowed for the bucket

### Issue: URLs not accessible
**Check:**
- R2 bucket has public access enabled
- Custom domain is configured correctly in R2
- Supabase storage policies allow public access
- URLs are using the correct format

### Issue: Provider not switching
**Check:**
- `.env` file has been updated
- Server has been restarted
- `STORAGE_PROVIDER` value is correct (`r2` or `supabase`)
- Required credentials for selected provider are present

## Success Criteria

All tests pass when:
1. ✅ Image generation works with both providers
2. ✅ Video generation works with both providers
3. ✅ Upload components work with both providers
4. ✅ Switching providers requires only env change + restart
5. ✅ Error messages are clear and helpful
6. ✅ Files are organized correctly in storage
7. ✅ URLs are accessible and use correct format
8. ✅ No code changes needed in application layer

## Notes

- Always restart the server after changing environment variables
- Test with real files of various sizes and types
- Verify files are actually accessible via the generated URLs
- Check storage dashboards to confirm files are in the correct locations
- Test both authenticated and unauthenticated scenarios
