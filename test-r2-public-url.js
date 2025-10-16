/**
 * Test script to verify R2 public URL configuration
 * Run with: node test-r2-public-url.js
 */

require('dotenv').config();

console.log('🔍 Verificando configuração do R2...\n');

// Check environment variables
const checks = {
  'R2_ACCOUNT_ID': process.env.R2_ACCOUNT_ID,
  'R2_ACCESS_KEY_ID': process.env.R2_ACCESS_KEY_ID,
  'R2_SECRET_ACCESS_KEY': process.env.R2_SECRET_ACCESS_KEY ? '***' : undefined,
  'R2_BUCKET_NAME': process.env.R2_BUCKET_NAME,
  'R2_PUBLIC_URL': process.env.R2_PUBLIC_URL,
};

let hasErrors = false;

for (const [key, value] of Object.entries(checks)) {
  if (!value) {
    console.log(`❌ ${key}: NÃO CONFIGURADO`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
}

console.log('\n📋 URLs geradas:');

if (process.env.R2_BUCKET_NAME) {
  const sampleKey = 'files/user-id/sample.jpg';
  
  // Private endpoint (usado para uploads)
  const privateUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${sampleKey}`;
  console.log(`\n🔒 Private URL (uploads):\n   ${privateUrl}`);
  
  // Public endpoint (usado para servir imagens)
  if (process.env.R2_PUBLIC_URL) {
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${sampleKey}`;
    console.log(`\n🌐 Public URL (serving):\n   ${publicUrl}`);
  } else {
    console.log(`\n⚠️  Public URL: NÃO CONFIGURADO`);
    console.log(`   Será usado o endpoint privado (não funciona para acesso público)`);
    hasErrors = true;
  }
}

console.log('\n📝 Próximos passos:');

if (hasErrors) {
  console.log('\n❌ Configuração incompleta!');
  
  if (!process.env.R2_PUBLIC_URL) {
    console.log('\n1. Configure o R2_PUBLIC_URL no arquivo .env:');
    console.log('   - Opção 1 (R2.dev): https://pub-{account-id}.r2.dev');
    console.log('   - Opção 2 (Custom): https://cdn.seudominio.com');
    console.log('\n2. Habilite "Public Access" no bucket do Cloudflare Dashboard');
    console.log('\n3. Adicione o hostname no next.config.ts em images.remotePatterns');
    console.log('\n4. Reinicie o servidor de desenvolvimento');
  }
} else {
  console.log('\n✅ Configuração completa!');
  console.log('\n1. Reinicie o servidor de desenvolvimento');
  console.log('2. Faça upload de uma imagem de teste');
  console.log('3. Verifique se a URL usa o domínio público configurado');
}

console.log('\n📚 Para mais informações, consulte: R2_IMAGE_HOSTNAME_FIX.md\n');
