#!/usr/bin/env node
/**
 * Test script to simulate KIE GPT-4o webhook callback
 */

import 'dotenv/config';

const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
  : 'http://localhost:3000/api/webhooks/kie';

// Replace with actual taskId from your generation
const TASK_ID = process.argv[2] || '14423c11b9b99bd342d274b31d6f2b31';

console.log('🧪 Testing KIE GPT-4o Webhook\n');
console.log('Configuration:');
console.log('- Webhook URL:', WEBHOOK_URL);
console.log('- Task ID:', TASK_ID);
console.log('');

/**
 * Simulate GPT-4o webhook callback
 */
async function testWebhook() {
  console.log('📤 Sending webhook callback...\n');

  // Simulate GPT-4o webhook payload
  const payload = {
    taskId: TASK_ID,
    status: 'completed',
    state: 'completed',
    data: {
      taskId: TASK_ID,
      state: 'completed',
      images: [
        {
          url: 'https://example.com/generated-image.png'
        }
      ]
    }
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook test PASSED');
    } else {
      console.log('\n❌ Webhook test FAILED');
    }
  } catch (error) {
    console.error('\n❌ Webhook test FAILED with exception:', error.message);
  }
}

testWebhook().catch(console.error);
