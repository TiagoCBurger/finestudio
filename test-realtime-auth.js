/**
 * Script de teste para verificar autenticação Realtime
 * 
 * Execute com: node test-realtime-auth.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Substitua com suas credenciais de teste
const TEST_EMAIL = 'seu-email@exemplo.com';
const TEST_PASSWORD = 'sua-senha';

async function testRealtimeAuth() {
  console.log('🔧 Iniciando teste de autenticação Realtime...\n');

  // 1. Criar cliente
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        log_level: 'info'
      }
    }
  });

  try {
    // 2. Fazer login
    console.log('📝 Fazendo login...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      return;
    }

    if (!session) {
      console.error('❌ Nenhuma sessão retornada');
      return;
    }

    console.log('✅ Login bem-sucedido');
    console.log('   User ID:', session.user.id);
    console.log('   Token expira em:', new Date(session.expires_at * 1000).toISOString());

    // 3. Configurar auth no Realtime
    console.log('\n🔐 Configurando autenticação no Realtime...');
    supabase.realtime.setAuth(session.access_token);
    console.log('✅ Auth configurado');

    // 4. Aguardar propagação
    console.log('\n⏰ Aguardando 2 segundos para propagação...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Tentar se inscrever em um canal privado
    console.log('\n📡 Tentando se inscrever no canal fal_jobs...');
    const channel = supabase
      .channel(`fal_jobs:${session.user.id}`, {
        config: {
          broadcast: { self: false, ack: true },
          private: true
        }
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.log('📨 Broadcast recebido:', payload);
      });

    // 6. Subscribe com callback detalhado
    const subscribePromise = new Promise((resolve, reject) => {
      channel.subscribe((status, err) => {
        console.log(`\n📊 Status: ${status}`);
        
        if (err) {
          console.error('   Erro:', err);
        }

        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ SUCESSO! Canal inscrito com sucesso');
            resolve();
            break;
          case 'CHANNEL_ERROR':
            console.error('❌ ERRO NO CANAL');
            reject(new Error(err?.message || 'Unknown error'));
            break;
          case 'TIMED_OUT':
            console.error('⏱️ TIMEOUT');
            reject(new Error('Subscription timed out'));
            break;
          case 'CLOSED':
            console.log('🔌 Canal fechado');
            break;
        }
      });
    });

    // 7. Aguardar resultado (com timeout de 10s)
    await Promise.race([
      subscribePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de 10s')), 10000)
      )
    ]);

    // 8. Manter conexão por 5s para testar
    console.log('\n⏰ Mantendo conexão por 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 9. Cleanup
    console.log('\n🧹 Limpando...');
    await supabase.removeChannel(channel);
    console.log('✅ Canal removido');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    console.log('\n✅ Teste concluído');
    process.exit(0);
  }
}

// Executar teste
testRealtimeAuth();
