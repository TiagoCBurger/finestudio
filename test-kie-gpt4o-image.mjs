#!/usr/bin/env node
/**
 * Test script for KIE GPT-4o Image API
 * Tests the new GPT-4o image generation endpoint
 */

import 'dotenv/config';

const KIE_API_KEY = process.env.KIE_API_KEY;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
  : undefined;

if (!KIE_API_KEY) {
  console.error('❌ KIE_API_KEY not found in environment');
  process.exit(1);
}

console.log('🧪 Testing KIE GPT-4o Image API\n');
console.log('Configuration:');
console.log('- API Key:', KIE_API_KEY.substring(0, 10) + '...');
console.log('- Webhook URL:', WEBHOOK_URL || 'Not configured');
console.log('');

/**
 * Test 1: Text-to-Image Generation
 */
async function testTextToImage() {
  console.log('📝 Test 1: Text-to-Image Generation');
  console.log('-----------------------------------');

  const requestBody = {
    prompt: 'A beautiful sunset over the mountains with vibrant colors',
    size: '1:1',
    nVariants: 1,
    isEnhance: false,
    uploadCn: false,
    enableFallback: false,
    fallbackModel: 'FLUX_MAX',
  };

  if (WEBHOOK_URL) {
    requestBody.callBackUrl = WEBHOOK_URL;
  }

  console.log('Request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://api.kie.ai/api/v1/gpt4o-image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('\nResponse Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.code === 200 && data.data?.taskId) {
      console.log('\n✅ Test 1 PASSED');
      console.log('Task ID:', data.data.taskId);
      return data.data.taskId;
    } else {
      console.log('\n❌ Test 1 FAILED');
      console.log('Error:', data.msg || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('\n❌ Test 1 FAILED with exception:', error.message);
    return null;
  }
}

/**
 * Test 2: Image-to-Image Generation (with reference images)
 */
async function testImageToImage() {
  console.log('\n\n📸 Test 2: Image-to-Image Generation');
  console.log('------------------------------------');

  const requestBody = {
    prompt: 'Transform this into a watercolor painting style',
    filesUrl: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=512',
    ],
    size: '1:1',
    nVariants: 1,
    isEnhance: false,
    uploadCn: false,
    enableFallback: false,
    fallbackModel: 'FLUX_MAX',
  };

  if (WEBHOOK_URL) {
    requestBody.callBackUrl = WEBHOOK_URL;
  }

  console.log('Request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://api.kie.ai/api/v1/gpt4o-image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('\nResponse Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.code === 200 && data.data?.taskId) {
      console.log('\n✅ Test 2 PASSED');
      console.log('Task ID:', data.data.taskId);
      return data.data.taskId;
    } else {
      console.log('\n❌ Test 2 FAILED');
      console.log('Error:', data.msg || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('\n❌ Test 2 FAILED with exception:', error.message);
    return null;
  }
}

/**
 * Test 3: Multiple Reference Images
 */
async function testMultipleImages() {
  console.log('\n\n🖼️  Test 3: Multiple Reference Images');
  console.log('--------------------------------------');

  const requestBody = {
    prompt: 'Combine these images into a cohesive artistic composition',
    filesUrl: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=512',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=512',
    ],
    size: '16:9',
    nVariants: 1,
    isEnhance: false,
    uploadCn: false,
    enableFallback: false,
    fallbackModel: 'FLUX_MAX',
  };

  if (WEBHOOK_URL) {
    requestBody.callBackUrl = WEBHOOK_URL;
  }

  console.log('Request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://api.kie.ai/api/v1/gpt4o-image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('\nResponse Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.code === 200 && data.data?.taskId) {
      console.log('\n✅ Test 3 PASSED');
      console.log('Task ID:', data.data.taskId);
      return data.data.taskId;
    } else {
      console.log('\n❌ Test 3 FAILED');
      console.log('Error:', data.msg || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('\n❌ Test 3 FAILED with exception:', error.message);
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const results = {
    textToImage: await testTextToImage(),
    imageToImage: await testImageToImage(),
    multipleImages: await testMultipleImages(),
  };

  console.log('\n\n📊 Test Summary');
  console.log('===============');
  console.log('Text-to-Image:', results.textToImage ? '✅ PASSED' : '❌ FAILED');
  console.log('Image-to-Image:', results.imageToImage ? '✅ PASSED' : '❌ FAILED');
  console.log('Multiple Images:', results.multipleImages ? '✅ PASSED' : '❌ FAILED');

  const passedCount = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal: ${passedCount}/3 tests passed`);

  if (WEBHOOK_URL) {
    console.log('\n💡 Tip: Check your webhook endpoint for completion callbacks');
    console.log('   Webhook URL:', WEBHOOK_URL);
  } else {
    console.log('\n⚠️  Note: NEXT_PUBLIC_APP_URL not set, webhooks will not be received');
    console.log('   Set NEXT_PUBLIC_APP_URL to test webhook functionality');
  }
}

runTests().catch(console.error);
