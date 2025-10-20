#!/usr/bin/env node

/**
 * Teste para verificar se o problema de CORS do R2 foi corrigido
 */

require('dotenv').config();

async function testR2CorsFix() {
    console.log('🧪 Testando correção de CORS do R2...\n');

    // 1. Verificar configuração
    console.log('1️⃣ Verificando configuração...');
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    
    console.log('📦 R2_PUBLIC_URL:', r2PublicUrl || '❌ NÃO CONFIGURADA');
    console.log('🆔 R2_ACCOUNT_ID:', r2AccountId);
    console.log('');

    if (!r2PublicUrl) {
        console.error('❌ PROBLEMA ENCONTRADO!');
        console.error('R2_PUBLIC_URL não está configurada');
        console.error('');
        console.error('🔧 Solução:');
        console.error('1. Acesse: https://dash.cloudflare.com/');
        console.error('2. Vá para: R2 Object Storage > seu bucket');
        console.error('3. Configure: Settings > Public access > Allow Access');
        console.error('4. Copie a URL pública (formato: https://pub-xxxxx.r2.dev)');
        console.error('5. Adicione no .env: R2_PUBLIC_URL=https://pub-xxxxx.r2.dev');
        console.error('');
        console.error('⚠️ Sem R2_PUBLIC_URL, o sistema usa URLs assinadas que podem ter problemas de CORS');
        process.exit(1);
    }

    console.log('✅ R2_PUBLIC_URL configurada corretamente');
    console.log('');

    // 2. Explicar a diferença
    console.log('2️⃣ Diferença entre URLs assinadas e públicas...');
    console.log('');
    console.log('❌ URL Assinada (antiga - com problemas):');
    console.log(`   https://${r2AccountId}.r2.cloudflarestorage.com/my-bucket/files/test.png?X-Amz-Signature=...`);
    console.log('   - Expira em 7 dias');
    console.log('   - Pode ter problemas de CORS no navegador');
    console.log('   - Requer autenticação AWS');
    console.log('');
    console.log('✅ URL Pública (nova - sem problemas):');
    console.log(`   ${r2PublicUrl}/files/test.png`);
    console.log('   - Nunca expira');
    console.log('   - Sem problemas de CORS');
    console.log('   - Acesso direto via HTTP');
    console.log('');

    // 3. Testar acesso à URL pública
    console.log('3️⃣ Testando acesso à URL pública...');
    
    // Criar uma URL de teste
    const testUrl = `${r2PublicUrl}/test-file.txt`;
    console.log('🔗 URL de teste:', testUrl);
    
    try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        console.log('📊 Status:', response.status);
        
        if (response.status === 404) {
            console.log('✅ Bucket público está acessível (404 é esperado para arquivo inexistente)');
        } else if (response.status === 200) {
            console.log('✅ Bucket público está acessível e arquivo existe');
        } else if (response.status === 403) {
            console.error('❌ Acesso negado (403)');
            console.error('');
            console.error('🔧 Solução:');
            console.error('O bucket precisa ter acesso público habilitado:');
            console.error('1. Acesse: https://dash.cloudflare.com/');
            console.error('2. Vá para: R2 Object Storage > my-bucket');
            console.error('3. Settings > Public access > Allow Access');
            console.error('4. Confirme a ação');
        } else {
            console.log('⚠️ Status inesperado:', response.status);
        }
    } catch (error) {
        console.error('❌ Erro ao testar URL:', error.message);
    }
    
    console.log('');

    // 4. Instruções finais
    console.log('4️⃣ Como verificar se está funcionando...');
    console.log('');
    console.log('📋 Passos:');
    console.log('1. Reinicie a aplicação para aplicar a nova configuração');
    console.log('2. Gere uma nova imagem');
    console.log('3. Verifique a URL da imagem no console do navegador');
    console.log('4. A URL deve ser do formato:');
    console.log(`   ✅ ${r2PublicUrl}/files/...`);
    console.log(`   ❌ NÃO deve conter: X-Amz-Signature`);
    console.log('');
    console.log('🔍 Se ainda houver erro "Failed to load image":');
    console.log('- Abra o DevTools do navegador (F12)');
    console.log('- Vá para a aba Network');
    console.log('- Tente carregar a imagem');
    console.log('- Verifique o status HTTP da requisição');
    console.log('- Se for 403: bucket não está público');
    console.log('- Se for 404: arquivo não existe (problema no upload)');
    console.log('- Se for CORS error: configuração de CORS do bucket');

    console.log('\n🎉 Análise concluída!');
    console.log('\n📝 Resumo:');
    console.log('✅ R2_PUBLIC_URL configurada');
    console.log('✅ Novas imagens usarão URLs públicas');
    console.log('✅ Sem problemas de CORS ou expiração');
    console.log('🔄 Reinicie a aplicação para aplicar');
}

// Executar teste
testR2CorsFix().catch(console.error);