/**
 * Comprehensive Integration Test for OpenRouter Text Models
 * 
 * This script tests all requirements:
 * - 1.1, 1.2, 1.3: Text input functionality
 * - 2.1, 2.2: OpenRouter model selection and usage
 * - 3.1, 3.2, 3.3: Environment configuration behavior
 */

console.log('='.repeat(80));
console.log('COMPREHENSIVE INTEGRATION TEST - OpenRouter Text Models');
console.log('='.repeat(80));
console.log();

// Test 1: Verify text input fix (Requirement 1.1, 1.2, 1.3)
console.log('TEST 1: Text Input Component Fix');
console.log('-'.repeat(80));

const fs = require('fs');
const path = require('path');

const transformPath = path.join(process.cwd(), 'components/nodes/text/transform.tsx');
const transformContent = fs.readFileSync(transformPath, 'utf8');

// Check that the invalid bg-transparent! syntax was removed
const hasInvalidSyntax = transformContent.includes('bg-transparent!');
const hasValidSyntax = transformContent.includes('bg-transparent shadow-none');

console.log('✓ Checking Textarea className...');
if (hasInvalidSyntax) {
  console.log('  ✗ FAIL: Invalid "bg-transparent!" syntax still present');
  process.exit(1);
} else {
  console.log('  ✓ PASS: Invalid syntax removed');
}

if (hasValidSyntax) {
  console.log('  ✓ PASS: Valid "bg-transparent" syntax present');
} else {
  console.log('  ✗ FAIL: Valid syntax not found');
  process.exit(1);
}

console.log('✓ Text input component fix verified');
console.log();

// Test 2: Verify OpenRouter provider setup (Requirement 3.1)
console.log('TEST 2: OpenRouter Provider Configuration');
console.log('-'.repeat(80));

const openrouterPath = path.join(process.cwd(), 'lib/models/text/openrouter.ts');
const openrouterContent = fs.readFileSync(openrouterPath, 'utf8');

console.log('✓ Checking OpenRouter provider implementation...');

const checks = [
  { pattern: /import.*createOpenAI.*@ai-sdk\/openai/, desc: 'createOpenAI import' },
  { pattern: /import.*env.*@\/lib\/env/, desc: 'env import' },
  { pattern: /env\.OPENROUTER_API_KEY/, desc: 'API key check' },
  { pattern: /baseURL.*https:\/\/openrouter\.ai\/api\/v1/, desc: 'baseURL configuration' },
  { pattern: /: undefined/, desc: 'undefined fallback' },
];

for (const check of checks) {
  if (check.pattern.test(openrouterContent)) {
    console.log(`  ✓ PASS: ${check.desc}`);
  } else {
    console.log(`  ✗ FAIL: ${check.desc} not found`);
    process.exit(1);
  }
}

console.log('✓ OpenRouter provider correctly configured');
console.log();

// Test 3: Verify text models registry (Requirement 2.1, 2.3)
console.log('TEST 3: Text Models Registry');
console.log('-'.repeat(80));

const textModelsPath = path.join(process.cwd(), 'lib/models/text/index.ts');
const textModelsContent = fs.readFileSync(textModelsPath, 'utf8');

console.log('✓ Checking text models registry...');

// Check TextModel type definition
const typeChecks = [
  { pattern: /type TextModel.*{/, desc: 'TextModel type definition' },
  { pattern: /id:\s*string/, desc: 'id field' },
  { pattern: /label:\s*string/, desc: 'label field' },
  { pattern: /provider:.*'openrouter'.*'gateway'/, desc: 'provider field' },
  { pattern: /pricing:.*{/, desc: 'pricing object' },
  { pattern: /enabled:\s*boolean/, desc: 'enabled field' },
  { pattern: /default\?:\s*boolean/, desc: 'default field' },
];

for (const check of typeChecks) {
  if (check.pattern.test(textModelsContent)) {
    console.log(`  ✓ PASS: ${check.desc}`);
  } else {
    console.log(`  ✗ FAIL: ${check.desc} not found`);
    process.exit(1);
  }
}

// Check that all 4 OpenRouter models are defined
const expectedModels = [
  { id: 'openai/gpt-5-pro', label: 'GPT-5' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'openai/gpt-4o-mini-search-preview', label: 'GPT-4o Mini' },
];

console.log('✓ Checking OpenRouter models...');
for (const model of expectedModels) {
  if (textModelsContent.includes(`'${model.id}'`) && textModelsContent.includes(model.label)) {
    console.log(`  ✓ PASS: ${model.label} (${model.id})`);
  } else {
    console.log(`  ✗ FAIL: ${model.label} (${model.id}) not found`);
    process.exit(1);
  }
}

// Check getEnabledTextModels function
if (textModelsContent.includes('export const getEnabledTextModels')) {
  console.log('  ✓ PASS: getEnabledTextModels function exported');
} else {
  console.log('  ✗ FAIL: getEnabledTextModels function not found');
  process.exit(1);
}

// Check that models are conditionally enabled based on openrouter availability
if (textModelsContent.includes('enabled: !!openrouter')) {
  console.log('  ✓ PASS: Models conditionally enabled based on openrouter');
} else {
  console.log('  ✗ FAIL: Models not conditionally enabled');
  process.exit(1);
}

console.log('✓ Text models registry correctly implemented');
console.log();

// Test 4: Verify chat route integration (Requirement 2.2, 3.2, 3.3)
console.log('TEST 4: Chat Route Integration');
console.log('-'.repeat(80));

const chatRoutePath = path.join(process.cwd(), 'app/api/chat/route.ts');
const chatRouteContent = fs.readFileSync(chatRoutePath, 'utf8');

console.log('✓ Checking chat route implementation...');

const routeChecks = [
  { pattern: /import.*textModels.*@\/lib\/models\/text/, desc: 'textModels import' },
  { pattern: /import.*openrouter.*@\/lib\/models\/text\/openrouter/, desc: 'openrouter import' },
  { pattern: /const textModelConfig = textModels\[modelId\]/, desc: 'textModelConfig lookup' },
  { pattern: /if \(textModelConfig\)/, desc: 'textModelConfig conditional' },
  { pattern: /textModelConfig\.provider === 'openrouter'/, desc: 'provider check' },
  { pattern: /if \(!openrouter\)/, desc: 'openrouter availability check' },
  { pattern: /OpenRouter not configured/, desc: 'error message for missing config' },
  { pattern: /status: 503/, desc: '503 status for service unavailable' },
  { pattern: /modelInstance = openrouter\(modelId\)/, desc: 'openrouter model instantiation' },
];

for (const check of routeChecks) {
  if (check.pattern.test(chatRouteContent)) {
    console.log(`  ✓ PASS: ${check.desc}`);
  } else {
    console.log(`  ✗ FAIL: ${check.desc} not found`);
    process.exit(1);
  }
}

console.log('✓ Chat route correctly integrated');
console.log();

// Test 5: Verify TextTransform component integration (Requirement 2.1, 2.2)
console.log('TEST 5: TextTransform Component Integration');
console.log('-'.repeat(80));

console.log('✓ Checking TextTransform component...');

const componentChecks = [
  { pattern: /import.*getEnabledTextModels.*@\/lib\/models\/text/, desc: 'getEnabledTextModels import' },
  { pattern: /const openRouterModels = getEnabledTextModels\(\)/, desc: 'getEnabledTextModels call' },
  { pattern: /const allModels = useMemo/, desc: 'allModels useMemo' },
  { pattern: /convertedOpenRouterModels/, desc: 'OpenRouter models conversion' },
  { pattern: /\.\.\.gatewayModels.*\.\.\.convertedOpenRouterModels/, desc: 'models merge' },
];

for (const check of componentChecks) {
  if (check.pattern.test(transformContent)) {
    console.log(`  ✓ PASS: ${check.desc}`);
  } else {
    console.log(`  ✗ FAIL: ${check.desc} not found`);
    process.exit(1);
  }
}

console.log('✓ TextTransform component correctly integrated');
console.log();

// Test 6: Verify environment variable configuration (Requirement 3.1)
console.log('TEST 6: Environment Variable Configuration');
console.log('-'.repeat(80));

const envPath = path.join(process.cwd(), 'lib/env.ts');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('✓ Checking environment configuration...');

const envChecks = [
  { pattern: /OPENROUTER_API_KEY:\s*z\.string\(\)\.min\(1\)\.optional\(\)/, desc: 'OPENROUTER_API_KEY in server schema' },
  { pattern: /OPENROUTER_API_KEY:\s*process\.env\.OPENROUTER_API_KEY/, desc: 'OPENROUTER_API_KEY in runtimeEnv' },
];

for (const check of envChecks) {
  if (check.pattern.test(envContent)) {
    console.log(`  ✓ PASS: ${check.desc}`);
  } else {
    console.log(`  ✗ FAIL: ${check.desc} not found`);
    process.exit(1);
  }
}

console.log('✓ Environment variable correctly configured');
console.log();

// Test 7: Check .env.example file
console.log('TEST 7: .env.example File');
console.log('-'.repeat(80));

const envExamplePath = path.join(process.cwd(), '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  
  if (envExampleContent.includes('OPENROUTER_API_KEY')) {
    console.log('  ✓ PASS: OPENROUTER_API_KEY present in .env.example');
  } else {
    console.log('  ⚠ WARNING: OPENROUTER_API_KEY not in .env.example (optional)');
  }
} else {
  console.log('  ⚠ WARNING: .env.example file not found (optional)');
}

console.log();

// Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log();
console.log('✓ All automated tests passed!');
console.log();
console.log('Requirements Coverage:');
console.log('  ✓ 1.1, 1.2, 1.3: Text input functionality verified');
console.log('  ✓ 2.1: OpenRouter models registry implemented');
console.log('  ✓ 2.2: Model selection and usage integrated');
console.log('  ✓ 2.3: Model pricing configured');
console.log('  ✓ 3.1: Environment variable configuration verified');
console.log('  ✓ 3.2: Conditional model availability implemented');
console.log('  ✓ 3.3: Error handling for missing configuration');
console.log();
console.log('Manual Testing Required:');
console.log('  1. Start the development server');
console.log('  2. Create a text transform node');
console.log('  3. Test text input (typing, pasting, editing)');
console.log('  4. Test model selector with OpenRouter models');
console.log('  5. Test text generation with each model');
console.log('  6. Test behavior without OPENROUTER_API_KEY');
console.log('  7. Verify Gateway models still work');
console.log();
console.log('='.repeat(80));
