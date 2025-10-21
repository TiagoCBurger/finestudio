#!/usr/bin/env node

/**
 * Test: Verificar se ambos os modelos nano-banana estão disponíveis
 */

// Simular a estrutura dos modelos
const imageModels = {
  'mock-fast': {
    label: '🧪 Mock Fast (Teste Grátis)',
    chef: { id: 'mock', name: 'Mock (Teste)' },
    enabled: true,
  },
  'fal-nano-banana': {
    label: '🍌 Nano Banana (Fal)',
    chef: { id: 'fal', name: 'Fal' },
    enabled: true,
  },
  'fal-flux-dev-image-to-image': {
    label: 'FLUX Dev Image-to-Image',
    chef: { id: 'fal', name: 'Fal' },
    enabled: true,
  },
  'kie-nano-banana': {
    label: '🍌 Nano Banana (Kie.ai)',
    chef: { id: 'kie', name: 'Kie.ai' },
    enabled: true,
  },
  'fal-gpt-image-edit': {
    label: 'GPT Image Edit (BYOK)',
    chef: { id: 'fal', name: 'Fal' },
    enabled: false,
  },
};

function getEnabledImageModels() {
  return Object.fromEntries(
    Object.entries(imageModels).filter(([_, model]) => model.enabled !== false)
  );
}

console.log('🧪 Testing Nano Banana models\n');

const enabledModels = getEnabledImageModels();

console.log('📊 Total enabled models:', Object.keys(enabledModels).length);
console.log('📋 Enabled model keys:', Object.keys(enabledModels).join(', '));

console.log('\n🍌 Nano Banana models:');
console.log('  fal-nano-banana:', enabledModels['fal-nano-banana'] ? '✅ Found' : '❌ Missing');
console.log('  kie-nano-banana:', enabledModels['kie-nano-banana'] ? '✅ Found' : '❌ Missing');

if (enabledModels['fal-nano-banana']) {
  console.log('\n📦 fal-nano-banana:');
  console.log('  Label:', enabledModels['fal-nano-banana'].label);
  console.log('  Chef:', enabledModels['fal-nano-banana'].chef.name);
}

if (enabledModels['kie-nano-banana']) {
  console.log('\n📦 kie-nano-banana:');
  console.log('  Label:', enabledModels['kie-nano-banana'].label);
  console.log('  Chef:', enabledModels['kie-nano-banana'].chef.name);
}

// Agrupar por chef (como o ModelSelector faz)
console.log('\n📂 Grouped by chef:');
const grouped = Object.entries(enabledModels).reduce((acc, [id, model]) => {
  const chef = model.chef.id;
  if (!acc[chef]) {
    acc[chef] = [];
  }
  acc[chef].push({ id, label: model.label });
  return acc;
}, {});

Object.entries(grouped).forEach(([chef, models]) => {
  const chefName = imageModels[models[0].id]?.chef.name || chef;
  console.log(`\n  ${chefName}:`);
  models.forEach(model => {
    console.log(`    - ${model.label} (${model.id})`);
  });
});

console.log('\n✅ Test complete!');
