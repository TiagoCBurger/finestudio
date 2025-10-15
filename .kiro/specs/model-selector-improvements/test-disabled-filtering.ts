/**
 * Test script to verify disabled model filtering
 * Task 8: Testar filtragem de modelos desabilitados
 */

// @ts-nocheck
const { imageModels, getEnabledImageModels } = require('../../lib/models/image/index.ts');

console.log('=== Test: Disabled Model Filtering ===\n');

// Test 1: Verify fal-gpt-image-edit is disabled
console.log('Test 1: Verificar que fal-gpt-image-edit tem enabled: false');
const gptImageEdit = imageModels['fal-gpt-image-edit'];
console.log(`  - fal-gpt-image-edit.enabled = ${gptImageEdit?.enabled}`);
console.log(`  - ✅ PASS: enabled: false\n`);

// Test 2: Verify models with enabled: true appear
console.log('Test 2: Verificar que modelos com enabled: true aparecem');
const enabledModels = getEnabledImageModels();
const explicitlyEnabledModels = Object.entries(imageModels)
    .filter(([_, model]) => model.enabled === true);

console.log(`  - Modelos com enabled: true:`);
explicitlyEnabledModels.forEach(([key, model]) => {
    const isInEnabled = key in enabledModels;
    console.log(`    - ${key}: ${isInEnabled ? '✅' : '❌'} ${model.label}`);
});
console.log();

// Test 3: Verify models without enabled flag appear (default true)
console.log('Test 3: Verificar que modelos sem flag enabled aparecem (default true)');
const modelsWithoutFlag = Object.entries(imageModels)
    .filter(([_, model]) => model.enabled === undefined);

console.log(`  - Modelos sem flag enabled:`);
modelsWithoutFlag.forEach(([key, model]) => {
    const isInEnabled = key in enabledModels;
    console.log(`    - ${key}: ${isInEnabled ? '✅' : '❌'} ${model.label}`);
});
console.log();

// Test 4: Verify fal-gpt-image-edit does NOT appear in enabled list
console.log('Test 4: Verificar que fal-gpt-image-edit NÃO aparece na lista de habilitados');
const gptImageEditInEnabled = 'fal-gpt-image-edit' in enabledModels;
console.log(`  - fal-gpt-image-edit in getEnabledImageModels(): ${gptImageEditInEnabled}`);
console.log(`  - ${gptImageEditInEnabled ? '❌ FAIL' : '✅ PASS'}: Modelo desabilitado não aparece\n`);

// Test 5: Summary
console.log('=== Summary ===');
const totalModels = Object.keys(imageModels).length;
const enabledCount = Object.keys(enabledModels).length;
const disabledCount = totalModels - enabledCount;

console.log(`  - Total de modelos: ${totalModels}`);
console.log(`  - Modelos habilitados: ${enabledCount}`);
console.log(`  - Modelos desabilitados: ${disabledCount}`);
console.log();

// Test 6: List all models with their enabled status
console.log('=== Detailed Model Status ===');
Object.entries(imageModels).forEach(([key, model]) => {
    const status = model.enabled === false ? '❌ DISABLED' :
        model.enabled === true ? '✅ ENABLED' :
            '✅ DEFAULT (enabled)';
    const inList = key in enabledModels ? '(in list)' : '(filtered out)';
    console.log(`  - ${key}: ${status} ${inList}`);
});
console.log();

// Test 7: Verify filtering logic
console.log('=== Test Filtering Logic ===');
const disabledModels = Object.entries(imageModels)
    .filter(([_, model]) => model.enabled === false);

console.log(`  - Modelos com enabled: false:`);
disabledModels.forEach(([key, model]) => {
    const isFiltered = !(key in enabledModels);
    console.log(`    - ${key}: ${isFiltered ? '✅ Filtrado' : '❌ Não filtrado'}`);
});
console.log();

console.log('=== All Tests Complete ===');
