/**
 * Verification script for Fal.ai video models
 * Run with: npx tsx .kiro/specs/fal-ai-new-models/verify-video-models.ts
 */

import { videoModels } from '@/lib/models/video';

console.log('🔍 Verifying Fal.ai Video Models Integration\n');

// Check if models are registered
const falKlingModel = videoModels['fal-kling-v2.5-turbo-pro'];
const falSoraModel = videoModels['fal-sora-2-pro'];

console.log('✅ Model Registration Check:');
console.log(`   - Kling v2.5 Turbo Pro: ${falKlingModel ? '✓ Found' : '✗ Missing'}`);
console.log(`   - Sora 2 Pro: ${falSoraModel ? '✓ Found' : '✗ Missing'}\n`);

if (falKlingModel) {
    console.log('📊 Kling Video v2.5 Turbo Pro Details:');
    console.log(`   - Label: ${falKlingModel.label}`);
    console.log(`   - Provider: ${falKlingModel.chef.name}`);
    console.log(`   - Model ID: ${falKlingModel.providers[0].model.modelId}`);
    console.log(`   - Cost (5s): $${falKlingModel.providers[0].getCost({ duration: 5 })}`);
    console.log(`   - Cost (10s): $${falKlingModel.providers[0].getCost({ duration: 10 })}\n`);
}

if (falSoraModel) {
    console.log('📊 Sora 2 Pro Details:');
    console.log(`   - Label: ${falSoraModel.label}`);
    console.log(`   - Provider: ${falSoraModel.chef.name}`);
    console.log(`   - Model ID: ${falSoraModel.providers[0].model.modelId}`);
    console.log(`   - Cost (5s): $${falSoraModel.providers[0].getCost({ duration: 5 })}`);
    console.log(`   - Cost (10s): $${falSoraModel.providers[0].getCost({ duration: 10 })}\n`);
}

// Verify cost calculations
console.log('💰 Cost Calculation Verification:');

if (falKlingModel) {
    const kling5sCost = falKlingModel.providers[0].getCost({ duration: 5 });
    const kling10sCost = falKlingModel.providers[0].getCost({ duration: 10 });

    console.log(`   Kling 5s: ${kling5sCost === 0.35 ? '✓' : '✗'} Expected $0.35, Got $${kling5sCost}`);
    console.log(`   Kling 10s: ${kling10sCost === 0.7 ? '✓' : '✗'} Expected $0.70, Got $${kling10sCost}`);
}

if (falSoraModel) {
    const sora5sCost = falSoraModel.providers[0].getCost({ duration: 5 });
    const sora10sCost = falSoraModel.providers[0].getCost({ duration: 10 });

    console.log(`   Sora 5s: ${sora5sCost === 1.2 ? '✓' : '✗'} Expected $1.20, Got $${sora5sCost}`);
    console.log(`   Sora 10s: ${sora10sCost === 1.2 ? '✓' : '✗'} Expected $1.20 (fixed), Got $${sora10sCost}`);
}

console.log('\n✨ Verification Complete!\n');

// List all video models for reference
console.log('📋 All Available Video Models:');
Object.entries(videoModels).forEach(([key, model]) => {
    const isFal = key.startsWith('fal-');
    const marker = isFal ? '🆕' : '  ';
    console.log(`   ${marker} ${key}: ${model.label}`);
});

console.log('\n🆕 = New Fal.ai models added in this task\n');
