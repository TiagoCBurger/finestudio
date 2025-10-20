#!/usr/bin/env node

/**
 * Teste do Mock Provider - Geração de imagens sem custo
 * 
 * Este script testa o provider mock que não gasta créditos
 */

import { mockAI } from './lib/models/image/mock.ts';

console.log('🧪 Testando Mock Provider - Geração sem custo\n');

async function testMockProvider() {
  try {
    // Teste 1: Geração simples
    console.log('📸 Teste 1: Geração de imagem simples');
    const model = mockAI.image('mock-fast');
    
    const result1 = await model.doGenerate({
      prompt: 'Um gato fofo com óculos de sol',
      size: '1024x1024',
      n: 1,
    });
    
    console.log('✅ Resultado:', {
      images: result1.images.length,
      url: result1.images[0].url,
      warnings: result1.warnings,
    });
    console.log('');

    // Teste 2: Múltiplas imagens
    console.log('📸 Teste 2: Geração de múltiplas imagens');
    const result2 = await model.doGenerate({
      prompt: 'Paisagem montanhosa ao pôr do sol',
      size: '768x1024',
      n: 3,
    });
    
    console.log('✅ Resultado:', {
      images: result2.images.length,
      urls: result2.images.map(img => img.url),
    });
    console.log('');

    // Teste 3: Tamanho diferente
    console.log('📸 Teste 3: Tamanho personalizado');
    const result3 = await model.doGenerate({
      prompt: 'Arte abstrata colorida',
      size: '512x512',
      n: 1,
    });
    
    console.log('✅ Resultado:', {
      url: result3.images[0].url,
    });
    console.log('');

    console.log('✅ Todos os testes passaram!');
    console.log('\n💡 Dica: Abra as URLs no navegador para ver as imagens de teste');
    console.log('💰 Custo total: R$ 0,00 (Mock Provider é grátis!)');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testMockProvider();
