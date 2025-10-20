/**
 * Teste para diagnosticar problema de carregamento de imagens do R2
 */

// URL da imagem que está falhando
const imageUrl = 'https://pub-fc1a8343fa6d4aa485c79384d30027c5.r2.dev/files/e04931a4-b423-449f-8cc5-d7574b79028c/jHhFYhgfs9uRK6fuMRK2A.png';

console.log('🔍 Testando carregamento da imagem do R2...\n');
console.log('URL:', imageUrl);
console.log('');

async function testImageAccess() {
  try {
    console.log('📡 Fazendo requisição HEAD...');
    const headResponse = await fetch(imageUrl, { method: 'HEAD' });
    
    console.log('Status:', headResponse.status, headResponse.statusText);
    console.log('Headers:');
    for (const [key, value] of headResponse.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log('');

    if (!headResponse.ok) {
      console.log('❌ Erro ao acessar a imagem');
      console.log('');
      
      // Tentar GET para ver o corpo da resposta
      console.log('📡 Tentando GET para ver detalhes do erro...');
      const getResponse = await fetch(imageUrl);
      const text = await getResponse.text();
      console.log('Resposta:', text.substring(0, 500));
      return;
    }

    console.log('✅ Imagem acessível!');
    console.log('');
    
    // Verificar CORS
    console.log('🔒 Verificando CORS...');
    const corsResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': corsResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': corsResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': corsResponse.headers.get('access-control-allow-headers'),
    };
    
    console.log('CORS Headers:', corsHeaders);
    
    if (!corsHeaders['access-control-allow-origin']) {
      console.log('⚠️  CORS não configurado! Isso pode causar problemas no browser.');
    } else {
      console.log('✅ CORS configurado corretamente');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testImageAccess();
