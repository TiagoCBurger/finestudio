/**
 * Simple verification script for video models (no env dependencies)
 * Run with: node .kiro/specs/fal-ai-new-models/verify-models-simple.js
 */

console.log('🔍 Verifying Fal.ai Video Models Integration\n');

// Read the video models file directly
const fs = require('fs');
const path = require('path');

const videoIndexPath = path.join(__dirname, '../../../lib/models/video/index.ts');
const videoFalPath = path.join(__dirname, '../../../lib/models/video/fal.ts');

console.log('📁 Checking files exist:');
console.log(`   - index.ts: ${fs.existsSync(videoIndexPath) ? '✓' : '✗'}`);
console.log(`   - fal.ts: ${fs.existsSync(videoFalPath) ? '✓' : '✗'}\n`);

if (fs.existsSync(videoIndexPath)) {
  const indexContent = fs.readFileSync(videoIndexPath, 'utf8');
  
  console.log('✅ Model Registration Check:');
  
  // Check for Kling model
  const hasKling = indexContent.includes("'fal-kling-v2.5-turbo-pro'");
  const hasKlingLabel = indexContent.includes('Kling Video v2.5 Turbo Pro (Fal)');
  const hasKlingModelId = indexContent.includes("fal('fal-ai/kling-video/v2.5-turbo/pro/image-to-video')");
  
  console.log(`   Kling v2.5 Turbo Pro:`);
  console.log(`      - Registry key: ${hasKling ? '✓' : '✗'}`);
  console.log(`      - Label: ${hasKlingLabel ? '✓' : '✗'}`);
  console.log(`      - Model ID: ${hasKlingModelId ? '✓' : '✗'}`);
  
  // Check for Sora model
  const hasSora = indexContent.includes("'fal-sora-2-pro'");
  const hasSoraLabel = indexContent.includes('Sora 2 Pro (Fal)');
  const hasSoraModelId = indexContent.includes("fal('fal-ai/sora-2/image-to-video/pro')");
  
  console.log(`   Sora 2 Pro:`);
  console.log(`      - Registry key: ${hasSora ? '✓' : '✗'}`);
  console.log(`      - Label: ${hasSoraLabel ? '✓' : '✗'}`);
  console.log(`      - Model ID: ${hasSoraModelId ? '✓' : '✗'}\n`);
  
  // Check cost calculations
  console.log('💰 Cost Calculation Check:');
  
  const klingCost5s = indexContent.match(/duration <= 5 \? 0\.35 : 0\.7/);
  const soraCost = indexContent.match(/return 1\.2/);
  
  console.log(`   Kling cost logic: ${klingCost5s ? '✓' : '✗'} (0.35 for 5s, 0.70 for 10s)`);
  console.log(`   Sora cost logic: ${soraCost ? '✓' : '✗'} (1.20 fixed)\n`);
  
  // Check import
  const hasFalImport = indexContent.includes("import { fal } from './fal'");
  console.log('📦 Import Check:');
  console.log(`   fal provider import: ${hasFalImport ? '✓' : '✗'}\n`);
}

if (fs.existsSync(videoFalPath)) {
  const falContent = fs.readFileSync(videoFalPath, 'utf8');
  
  console.log('🔧 Fal.ai Provider Implementation Check:');
  
  const hasKlingType = falContent.includes('fal-ai/kling-video/v2.5-turbo/pro/image-to-video');
  const hasSoraType = falContent.includes('fal-ai/sora-2/image-to-video/pro');
  const hasImageValidation = falContent.includes('requires an image input');
  const hasPolling = falContent.includes('while (Date.now() - startTime < maxPollTime)');
  const hasTimeout = falContent.includes('maxPollTime = modelId.includes(\'sora\')');
  
  console.log(`   - Kling model type: ${hasKlingType ? '✓' : '✗'}`);
  console.log(`   - Sora model type: ${hasSoraType ? '✓' : '✗'}`);
  console.log(`   - Image validation: ${hasImageValidation ? '✓' : '✗'}`);
  console.log(`   - Polling mechanism: ${hasPolling ? '✓' : '✗'}`);
  console.log(`   - Timeout logic: ${hasTimeout ? '✓' : '✗'}\n`);
}

console.log('✨ Static Verification Complete!\n');
console.log('📝 Next Steps:');
console.log('   1. Start the application: npm run dev');
console.log('   2. Follow the manual testing guide in test-report-task-10.md');
console.log('   3. Verify models appear in the UI');
console.log('   4. Test video generation with both models');
console.log('   5. Confirm cost calculations and polling behavior\n');
