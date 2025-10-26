#!/usr/bin/env node

import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ OPENROUTER_API_KEY found:', OPENROUTER_API_KEY.substring(0, 20) + '...');

const testMessages = [
  {
    role: 'user',
    content: 'Say "Hello, World!" and nothing else.'
  }
];

console.log('\n🚀 Testing OpenRouter API...');
console.log('Model: openai/gpt-4o-mini-search-preview');
console.log('Messages:', JSON.stringify(testMessages, null, 2));

try {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://fine.studio',
      'X-Title': 'Fine Studio',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini-search-preview',
      messages: testMessages,
      stream: false,
    }),
  });

  console.log('\n📡 Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('\n❌ OpenRouter API error:');
    console.error('Status:', response.status);
    console.error('Error:', errorText);
    process.exit(1);
  }

  const data = await response.json();
  console.log('\n✅ Success! Response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.choices && data.choices[0]) {
    console.log('\n💬 Generated text:', data.choices[0].message.content);
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}
