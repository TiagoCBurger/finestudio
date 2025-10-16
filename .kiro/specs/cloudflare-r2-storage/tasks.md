# Implementation Plan

- [x] 1. Setup project dependencies and types
  - Install @aws-sdk/client-s3 package
  - Create storage types interface file (lib/storage/types.ts)
  - Define StorageProvider interface, StorageBucket type, UploadOptions and UploadResult interfaces
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 2. Implement R2 storage provider
  - Create R2 storage provider file (lib/storage/r2.ts)
  - Implement R2StorageProvider class with S3Client initialization
  - Validate required environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)
  - Implement upload method with proper key structure (bucket/userId/filename)
  - Implement public URL generation with support for custom domain (R2_PUBLIC_URL)
  - Handle File/Buffer/Uint8Array conversions
  - Export singleton instance
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Implement Supabase storage provider
  - Create Supabase storage provider file (lib/storage/supabase.ts)
  - Implement SupabaseStorageProvider class implementing StorageProvider interface
  - Implement upload method using existing Supabase client
  - Handle File/Buffer/Uint8Array conversions
  - Maintain existing upsert behavior
  - Export singleton instance
  - _Requirements: 2.3, 3.2, 4.2, 4.3_

- [x] 4. Create storage provider factory
  - Create factory file (lib/storage/factory.ts)
  - Implement getStorageProvider function that reads STORAGE_PROVIDER env var
  - Default to 'r2' when STORAGE_PROVIDER is not defined
  - Return appropriate provider instance (r2Storage or supabaseStorage)
  - Handle unknown provider types with clear error
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Update environment configuration
  - Update lib/env.ts to add STORAGE_PROVIDER enum validation
  - Add R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)
  - Make R2 variables optional (only required when STORAGE_PROVIDER=r2)
  - Add variables to runtimeEnv object
  - Update .env.example with new variables and documentation
  - _Requirements: 1.1, 2.1, 2.5, 6.5_

- [x] 6. Refactor upload function
  - Update lib/upload.ts to use storage provider factory
  - Replace direct Supabase storage calls with provider abstraction
  - Maintain existing function signature (file, bucket, filename)
  - Keep authentication check before upload
  - Keep filename generation logic with nanoid
  - Ensure return format stays the same (url, type)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.3, 7.4, 8.1, 8.2, 8.3_

- [x] 7. Add content validation and security
  - Add file size validation (MAX_FILE_SIZE constant)
  - Add content type validation per bucket (allowedTypes map)
  - Implement validation before upload in uploadFile function
  - Add clear error messages for validation failures
  - _Requirements: 6.1, 6.2, 8.4, 8.5_

- [x] 8. Update error handling
  - Create storage error classes (lib/storage/errors.ts)
  - Define StorageError, StorageConfigError, StorageUploadError, StorageAuthError
  - Update R2 provider to throw appropriate errors
  - Update Supabase provider to throw appropriate errors
  - Update factory to throw clear configuration errors
  - _Requirements: 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.5_

- [x] 9. Update documentation
  - Create R2 setup guide (docs/R2_SETUP.md)
  - Document environment variables
  - Document bucket configuration steps
  - Document custom domain setup
  - Add migration guide from Supabase to R2
  - Add troubleshooting section
  - _Requirements: 1.1, 1.4, 5.1, 5.2_

- [x] 10. Verify integration with existing code
  - Test that image generation (app/actions/image/create.ts) works without changes
  - Test that video generation (app/actions/video/create.ts) works without changes
  - Verify upload components continue to work
  - Test switching between providers by changing STORAGE_PROVIDER
  - Verify error messages are clear and helpful
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
