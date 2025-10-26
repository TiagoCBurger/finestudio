/**
 * Teste para verificar roteamento entre nano-banana e nano-banana-edit
 */

// Simular configuração dos modelos
const imageModels = {
    'kie-nano-banana': {
        label: '🍌 Nano Banana (Kie.ai)',
        supportsEdit: true,
        providerOptions: {
            kie: {
                editModelId: 'google/nano-banana-edit',
            },
        },
    },
};

// Simular a lógica da action
function selectModel(params) {
    let effectiveModelId = params.modelId;

    console.log('📥 Input:', {
        modelId: params.modelId,
        hasImages: !!params.images?.length,
        imageCount: params.images?.length ?? 0,
        images: params.images,
    });

    // Se há imagens conectadas, verificar se deve usar modelo de edição
    if (params.images && params.images.length > 0) {
        const modelConfig = imageModels[params.modelId];

        console.log('🔍 Model configuration check:', {
            modelId: params.modelId,
            hasConfig: !!modelConfig,
            supportsEdit: modelConfig?.supportsEdit,
            hasProviderOptions: !!modelConfig?.providerOptions,
            kieOptions: modelConfig?.providerOptions?.kie,
        });

        if (modelConfig?.supportsEdit && modelConfig.providerOptions?.kie?.editModelId) {
            const editModelId = modelConfig.providerOptions.kie.editModelId;
            console.log('✅ Switching to edit model:', {
                originalModel: params.modelId,
                editModel: editModelId,
                imageCount: params.images.length,
            });
            effectiveModelId = editModelId;
        } else {
            console.log('❌ No edit model configured');
        }
    } else {
        console.log('ℹ️ No images provided, using text-to-image model');
    }

    console.log('📤 Output:', {
        effectiveModelId,
        shouldBeEdit: params.images?.length > 0,
    });

    return effectiveModelId;
}

// Testes
console.log('\n=== Teste 1: Sem imagens ===');
const result1 = selectModel({
    modelId: 'kie-nano-banana',
    images: [],
});
console.log('Resultado:', result1);
console.log('Esperado: kie-nano-banana');
console.log('Passou:', result1 === 'kie-nano-banana' ? '✅' : '❌');

console.log('\n=== Teste 2: Com 1 imagem ===');
const result2 = selectModel({
    modelId: 'kie-nano-banana',
    images: ['https://example.com/image1.png'],
});
console.log('Resultado:', result2);
console.log('Esperado: google/nano-banana-edit');
console.log('Passou:', result2 === 'google/nano-banana-edit' ? '✅' : '❌');

console.log('\n=== Teste 3: Com múltiplas imagens ===');
const result3 = selectModel({
    modelId: 'kie-nano-banana',
    images: [
        'https://example.com/image1.png',
        'https://example.com/image2.png',
    ],
});
console.log('Resultado:', result3);
console.log('Esperado: google/nano-banana-edit');
console.log('Passou:', result3 === 'google/nano-banana-edit' ? '✅' : '❌');
