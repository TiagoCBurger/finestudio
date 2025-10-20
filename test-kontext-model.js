#!/usr/bin/env node

/**
 * Test script for FLUX Pro Kontext model
 * 
 * This script tests the newly enabled fal-ai/flux-pro/kontext model
 * to ensure it's properly configured and working.
 */

import { config } from 'dotenv';
import { fal } from '@fal-ai/client';

// Load environment variables
config();

const FAL_API_KEY = process.env.FAL_API_KEY;

if (!FAL_API_KEY) {
  console.error('❌ FAL_API_KEY not found in environment variables');
  process.exit(1);
}

// Configure fal client
fal.config({
  credentials: FAL_API_KEY,
});

async function testKontextModel() {
  console.log('🧪 Testing FLUX Pro Kontext model...\n');

  const modelId = 'fal-ai/flux-pro/kontext';
  
  const input = {
    prompt: 'A beautiful sunset over mountains, vibrant colors, professional photography',
    image_size: {
      width: 1024,
      height: 1024,
    },
    num_images: 1,
  };

  console.log('📝 Input:', JSON.stringify(input, null, 2));
  console.log('\n🚀 Submitting to queue...');

  try {
    const { request_id } = await fal.queue.submit(modelId, { input });
    console.log('✅ Submitted successfully!');
    console.log('📋 Request ID:', request_id);

    console.log('\n⏳ Waiting for result...');
    const result = await fal.queue.result(modelId, { requestId: request_id });

    console.log('\n✅ Generation complete!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.data?.images?.[0]?.url) {
      console.log('\n🖼️  Image URL:', result.data.images[0].url);
      console.log('📐 Dimensions:', `${result.data.images[0].width}x${result.data.images[0].height}`);
      console.log('🌱 Seed:', result.data.seed);
    }

    console.log('\n✅ Test passed! FLUX Pro Kontext is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.body) {
      console.error('Error details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run test
testKontextModel().catch(console.error);
