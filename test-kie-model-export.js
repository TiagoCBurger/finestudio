#!/usr/bin/env node

/**
 * Test: Verificar se kie-nano-banana está sendo exportado corretamente
 */

async function testKieModelExport() {
  console.log('🧪 Testing kie-nano-banana export\n');

  try {
    // Importar o módulo
    const { imageModels, getEnabledImageModels } = await import('./lib/models/image/index.ts');

    console.log('✅ Module imported successfully\n');

    // Verificar se kie-nano-banana existe
    console.log('📋 Checking imageModels object:');
    console.log('  Total models:', Object.keys(imageModels).length);
    console.log('  Has kie-nano-banana:', 'kie-nano-banana' in imageModels);

    if ('kie-nano-banana' in imageModels) {
      const model = imageModels['kie-nano-banana'];
      console.log('\n🍌 kie-nano-banana details:');
      console.log('  Label:', model.label);
      console.log('  Chef:', model.chef?.name);
      console.log('  Enabled:', model.enabled);
      console.log('  Supports Edit:', model.supportsEdit);
      console.log('  Default:', model.default);
      console.log('  Sizes:', model.sizes);
      console.log('  Price Indicator:', model.priceIndicator);
    }

    // Verificar getEnabledImageModels
    console.log('\n📋 Checking getEnabledImageModels():');
    const enabledModels = getEnabledImageModels();
    console.log('  Total enabled:', Object.keys(enabledModels).length);
    console.log('  Has kie-nano-banana:', 'kie-nano-banana' in enabledModels);

    if ('kie-nano-banana' in enabledModels) {
      console.log('\n✅ SUCCESS: kie-nano-banana is in enabled models!');
    } else {
      console.log('\n❌ FAIL: kie-nano-banana is NOT in enabled models!');
      console.log('\nEnabled models:');
      Object.keys(enabledModels).forEach(key => {
        console.log(`  - ${key}: ${enabledModels[key].label}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testKieModelExport();
