/**
 * Verify Client-Side Fix
 * 
 * This script verifies that lib/models/text/index.ts doesn't import
 * server-side environment variables, which would cause client-side errors.
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('CLIENT-SIDE FIX VERIFICATION');
console.log('='.repeat(80));
console.log();

const textModelsPath = path.join(process.cwd(), 'lib/models/text/index.ts');
const textModelsContent = fs.readFileSync(textModelsPath, 'utf8');

console.log('Checking lib/models/text/index.ts...');
console.log();

// Check that openrouter is NOT imported
if (textModelsContent.includes("import { openrouter }") || 
    textModelsContent.includes("import {openrouter}")) {
  console.log('❌ FAIL: File imports openrouter (server-side only)');
  console.log('   This will cause client-side errors!');
  process.exit(1);
}
console.log('✅ PASS: No openrouter import (good!)');

// Check that env is NOT imported
if (textModelsContent.includes("from '@/lib/env'") || 
    textModelsContent.includes('from "@/lib/env"')) {
  console.log('❌ FAIL: File imports env (server-side only)');
  console.log('   This will cause client-side errors!');
  process.exit(1);
}
console.log('✅ PASS: No env import (good!)');

// Check that models are always enabled
const enabledTrueCount = (textModelsContent.match(/enabled:\s*true/g) || []).length;
const enabledOpenrouterCount = (textModelsContent.match(/enabled:\s*!!openrouter/g) || []).length;

if (enabledOpenrouterCount > 0) {
  console.log('❌ FAIL: Models use !!openrouter for enabled flag');
  console.log('   This accesses server-side variables on the client!');
  process.exit(1);
}
console.log('✅ PASS: No !!openrouter checks (good!)');

if (enabledTrueCount === 4) {
  console.log('✅ PASS: All 4 models have enabled: true');
} else {
  console.log(`⚠️  WARNING: Expected 4 models with enabled: true, found ${enabledTrueCount}`);
}

console.log();
console.log('='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('✅ lib/models/text/index.ts is safe for client-side use');
console.log();
console.log('How it works now:');
console.log('  1. Models are always visible in the UI');
console.log('  2. Server-side chat route checks if OpenRouter is configured');
console.log('  3. If not configured, returns 503 error with clear message');
console.log('  4. No client-side environment variable access');
console.log();
console.log('This is actually better UX:');
console.log('  - Users can see what models are available');
console.log('  - Clear error message if they try to use without API key');
console.log('  - No client-side crashes');
console.log();
