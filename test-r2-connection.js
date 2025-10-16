#!/usr/bin/env node

/**
 * R2 Connection Test Script
 * 
 * This script tests your R2 configuration and permissions.
 * Run with: node test-r2-connection.js
 */

require('dotenv').config();

async function testR2Connection() {
  console.log('🧪 R2 Connection Test\n');
  console.log('='.repeat(50));

  // Step 1: Check environment variables
  console.log('\n📋 Step 1: Checking environment variables...\n');

  const requiredVars = {
    'STORAGE_PROVIDER': process.env.STORAGE_PROVIDER,
    'R2_ACCOUNT_ID': process.env.R2_ACCOUNT_ID,
    'R2_ACCESS_KEY_ID': process.env.R2_ACCESS_KEY_ID,
    'R2_SECRET_ACCESS_KEY': process.env.R2_SECRET_ACCESS_KEY,
    'R2_BUCKET_NAME': process.env.R2_BUCKET_NAME,
  };

  let hasAllVars = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      console.log(`  ❌ ${key} is not set`);
      hasAllVars = false;
    } else {
      // Mask sensitive values
      const displayValue = key.includes('SECRET') || key.includes('KEY')
        ? value.substring(0, 8) + '...'
        : value;
      console.log(`  ✅ ${key} = ${displayValue}`);
    }
  }

  if (!hasAllVars) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please check your .env file and ensure all R2 variables are set.');
    process.exit(1);
  }

  if (process.env.STORAGE_PROVIDER !== 'r2') {
    console.log(`\n⚠️  Warning: STORAGE_PROVIDER is set to '${process.env.STORAGE_PROVIDER}', not 'r2'`);
    console.log('The application will not use R2 storage.');
  }

  // Step 2: Test R2 connection
  console.log('\n📡 Step 2: Testing R2 connection...\n');

  try {
    const { S3Client, ListBucketsCommand, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Test 2a: List buckets
    console.log('  Testing: List buckets...');
    try {
      const listCommand = new ListBucketsCommand({});
      const bucketsResult = await client.send(listCommand);
      const bucketNames = bucketsResult.Buckets?.map(b => b.Name) || [];
      console.log(`  ✅ Successfully listed ${bucketNames.length} bucket(s)`);
      
      if (bucketNames.length > 0) {
        console.log(`     Buckets: ${bucketNames.join(', ')}`);
      }

      // Check if our bucket exists
      if (!bucketNames.includes(process.env.R2_BUCKET_NAME)) {
        console.log(`  ⚠️  Warning: Bucket '${process.env.R2_BUCKET_NAME}' not found in your account`);
        console.log(`     Available buckets: ${bucketNames.join(', ') || 'none'}`);
        console.log(`     You may need to create the bucket or update R2_BUCKET_NAME in .env`);
      } else {
        console.log(`  ✅ Target bucket '${process.env.R2_BUCKET_NAME}' exists`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to list buckets: ${error.message}`);
      if (error.Code === 'InvalidAccessKeyId') {
        console.log('     → Check R2_ACCESS_KEY_ID in .env');
      } else if (error.Code === 'SignatureDoesNotMatch') {
        console.log('     → Check R2_SECRET_ACCESS_KEY in .env');
      }
      throw error;
    }

    // Test 2b: Check bucket access
    console.log('\n  Testing: Bucket access...');
    try {
      const headCommand = new HeadBucketCommand({
        Bucket: process.env.R2_BUCKET_NAME,
      });
      await client.send(headCommand);
      console.log(`  ✅ Successfully accessed bucket '${process.env.R2_BUCKET_NAME}'`);
    } catch (error) {
      console.log(`  ❌ Failed to access bucket: ${error.message}`);
      if (error.Code === 'NoSuchBucket') {
        console.log(`     → Bucket '${process.env.R2_BUCKET_NAME}' does not exist`);
        console.log('     → Create it in Cloudflare Dashboard or update R2_BUCKET_NAME');
      } else if (error.Code === 'AccessDenied') {
        console.log('     → API token does not have permission to access this bucket');
        console.log('     → Create a new token with "Object Read & Write" permission');
      }
      throw error;
    }

    // Test 2c: Upload test file
    console.log('\n  Testing: File upload...');
    try {
      const testKey = `test/connection-test-${Date.now()}.txt`;
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: testKey,
        Body: Buffer.from(`R2 connection test successful!\nTimestamp: ${new Date().toISOString()}`),
        ContentType: 'text/plain',
      });
      await client.send(uploadCommand);
      console.log(`  ✅ Successfully uploaded test file: ${testKey}`);

      // Generate public URL
      const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${testKey}`
        : `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${testKey}`;
      
      console.log(`\n  📎 Public URL: ${publicUrl}`);
      console.log('     Try accessing this URL in your browser to verify public access.');
    } catch (error) {
      console.log(`  ❌ Failed to upload file: ${error.message}`);
      if (error.Code === 'AccessDenied') {
        console.log('     → API token does not have "Object Read & Write" permission');
        console.log('     → Create a new token with correct permissions');
      }
      throw error;
    }

    // Success!
    console.log('\n' + '='.repeat(50));
    console.log('✅ All R2 tests passed!');
    console.log('='.repeat(50));
    console.log('\nYour R2 configuration is working correctly.');
    console.log('You can now use R2 storage in your application.\n');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ R2 Connection Test Failed');
    console.log('='.repeat(50));
    console.log('\nError details:', error.message);
    
    if (error.Code) {
      console.log('Error code:', error.Code);
    }

    console.log('\n📚 Troubleshooting:');
    console.log('1. Check R2_PERMISSIONS_FIX.md for detailed solutions');
    console.log('2. Verify your API token has correct permissions');
    console.log('3. Ensure the bucket exists in Cloudflare dashboard');
    console.log('4. Restart your development server after fixing .env\n');

    console.log('💡 Quick fix: Use Supabase temporarily');
    console.log('   Set STORAGE_PROVIDER=supabase in .env\n');

    process.exit(1);
  }
}

// Check if @aws-sdk/client-s3 is installed
try {
  require('@aws-sdk/client-s3');
} catch (error) {
  console.log('❌ @aws-sdk/client-s3 is not installed');
  console.log('This package should be installed as part of your dependencies.');
  console.log('\nIf you see this error, run: npm install @aws-sdk/client-s3\n');
  process.exit(1);
}

// Run the test
testR2Connection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
