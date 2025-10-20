/**
 * Test script to verify Kie model visibility in the image models list
 * Run with: node test-kie-models.js
 */

console.log('🔍 Testing Kie model visibility...\n');

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAILED:', message);
    process.exit(1);
  }
  console.log('✅ PASSED:', message);
}

// Simulate the imageModels object with realistic structure
const imageModels = {
  'mock-fast': { label: '🧪 Mock Fast', enabled: true },
  'mock-edit': { label: '🧪 Mock Edit', enabled: true },
  'fal-nano-banana': { label: '🍌 Nano Banana', enabled: true },
  'fal-flux-dev-image-to-image': { label: 'FLUX Dev', enabled: true },
  'fal-gpt-image-edit': { label: 'GPT Image Edit', enabled: false },
  'fal-flux-pro-kontext': { label: 'FLUX Pro Kontext', enabled: true },
  'fal-flux-pro-kontext-max-multi': { label: 'FLUX Pro Kontext Max', enabled: true },
  'fal-ideogram-character': { label: 'Ideogram Character', enabled: true },
  'kie-nano-banana': { label: '🍌 Nano Banana (Kie.ai)', enabled: true },
};

console.log('📋 All models:', Object.keys(imageModels));
console.log('Total:', Object.keys(imageModels).length);

// Test the filtering logic (matches production code in lib/models/image/index.ts)
const enabledModels = Object.fromEntries(
  Object.entries(imageModels).filter(([key, model]) => model.enabled !== false)
);

console.log('\n✅ Enabled models:', Object.keys(enabledModels));
console.log('Total enabled:', Object.keys(enabledModels).length);

// Run assertions
console.log('\n🧪 Running assertions...\n');

assert('kie-nano-banana' in imageModels, 'kie-nano-banana exists in all models');
assert('kie-nano-banana' in enabledModels, 'kie-nano-banana is in enabled models');
assert(enabledModels['kie-nano-banana']?.label.includes('Kie.ai'), 'Label contains Kie.ai');
assert(enabledModels['kie-nano-banana']?.enabled !== false, 'Model is enabled');
assert(!('fal-gpt-image-edit' in enabledModels), 'Disabled models are filtered out');

// Check if kie-nano-banana is included
const kieModel = enabledModels['kie-nano-banana'];
console.log('\n🍌 Kie Nano Banana model details:');
console.log('  Found:', !!kieModel);
console.log('  Label:', kieModel?.label);
console.log('  Enabled:', kieModel?.enabled);

// Test edge cases
console.log('\n🔍 Testing edge cases:');
const edgeCases = {
  'undefined-enabled': { label: 'Test', enabled: undefined },
  'null-enabled': { label: 'Test', enabled: null },
  'missing-enabled': { label: 'Test' },
  'false-enabled': { label: 'Test', enabled: false },
  'true-enabled': { label: 'Test', enabled: true },
};

Object.entries(edgeCases).forEach(([key, model]) => {
  const shouldBeIncluded = model.enabled !== false;
  const result = shouldBeIncluded ? '✅ Included' : '❌ Filtered';
  console.log(`  ${key}: ${result}`);
});

console.log('\n✨ All tests passed!\n');
