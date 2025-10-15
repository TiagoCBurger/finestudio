/**
 * Script de teste para o modelo GPT Image Edit (BYOK)
 * 
 * Este script testa a integração do modelo fal-ai/gpt-image-1/edit-image/byok
 * 
 * Uso:
 * node .kiro/specs/fal-ai-new-models/test-gpt-image-edit.js
 */

const { fal } = require("@fal-ai/client");

async function testGptImageEdit() {
  console.log('🧪 Testando GPT Image Edit (BYOK)...\n');

  try {
    // Configurar a chave da OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      console.error('❌ OPENAI_API_KEY não encontrada no ambiente');
      console.log('💡 Adicione OPENAI_API_KEY ao arquivo .env');
      process.exit(1);
    }

    console.log('✅ Chave OpenAI encontrada');
    console.log('📸 Iniciando edição de imagem...\n');

    const result = await fal.subscribe("fal-ai/gpt-image-1/edit-image/byok", {
      input: {
        image_urls: ["https://storage.googleapis.com/falserverless/model_tests/gpt-image-1/cyberpunk.png"],
        prompt: "Make this pixel-art style.",
        openai_api_key: openaiKey,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('\n✅ Imagem editada com sucesso!');
    console.log('📊 Resultado:', result.data);
    console.log('🆔 Request ID:', result.requestId);

    if (result.data?.images?.[0]?.url) {
      console.log('\n🖼️  URL da imagem:', result.data.images[0].url);
    }

  } catch (error) {
    console.error('\n❌ Erro ao testar GPT Image Edit:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

testGptImageEdit();
