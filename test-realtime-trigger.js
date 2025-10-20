#!/usr/bin/env node

/**
 * Teste do Trigger de Broadcast
 * Verifica se o trigger está disparando broadcasts quando o projeto é atualizado
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

console.log('🧪 Teste do Trigger de Broadcast\n');

const PROJECT_ID = 'cd882720-e06d-4a9e-8a13-a7d268871652';

async function testTrigger() {
  // Criar cliente com service role para ver logs do trigger
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('1️⃣ Configurando listener...');
  
  let receivedBroadcast = false;
  let broadcastPayload = null;
  
  const channel = supabase
    .channel(`project:${PROJECT_ID}`, {
      config: {
        broadcast: { self: false, ack: true },
        private: true,
      },
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      receivedBroadcast = true;
      broadcastPayload = payload;
      console.log('📨 Broadcast recebido!', {
        event: 'project_updated',
        payload: JSON.stringify(payload, null, 2)
      });
    });
  
  console.log('2️⃣ Obtendo sessão...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ Erro ao obter sessão:', sessionError?.message || 'Sem sessão');
    console.log('💡 Execute: node test-realtime-auth.js para fazer login primeiro');
    return;
  }
  
  console.log('✅ Sessão encontrada:', session.user.email);
  
  console.log('3️⃣ Configurando auth no realtime...');
  await supabase.realtime.setAuth(session.access_token);
  
  console.log('4️⃣ Subscrevendo ao canal...');
  await new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      console.log(`🔌 Status: ${status}`, err ? `Erro: ${err.message}` : '');
      if (status === 'SUBSCRIBED') resolve();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status));
    });
  });
  
  console.log('✅ Subscrito ao canal!\n');
  
  console.log('5️⃣ Atualizando projeto...');
  
  // Buscar projeto atual
  const { data: project, error: fetchError } = await supabase
    .from('project')
    .select('content')
    .eq('id', PROJECT_ID)
    .single();
  
  if (fetchError) {
    console.error('❌ Erro ao buscar projeto:', fetchError.message);
    return;
  }
  
  // Fazer uma pequena alteração
  const updatedContent = {
    ...(project.content || {}),
    _test_timestamp: Date.now()
  };
  
  const { error: updateError } = await supabase
    .from('project')
    .update({ 
      content: updatedContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', PROJECT_ID);
  
  if (updateError) {
    console.error('❌ Erro ao atualizar projeto:', updateError.message);
    return;
  }
  
  console.log('✅ Projeto atualizado no banco de dados');
  
  console.log('\n6️⃣ Aguardando broadcast (5 segundos)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n7️⃣ Resultados:');
  if (receivedBroadcast) {
    console.log('✅ SUCESSO! Broadcast recebido');
    console.log('📦 Payload:', JSON.stringify(broadcastPayload, null, 2));
  } else {
    console.log('❌ FALHA! Nenhum broadcast recebido');
    console.log('\n🔍 Possíveis causas:');
    console.log('   1. Trigger não está disparando');
    console.log('   2. Função realtime.broadcast_changes não existe ou tem erro');
    console.log('   3. Política RLS bloqueando o broadcast');
    console.log('   4. Canal configurado incorretamente');
  }
  
  // Cleanup
  console.log('\n🧹 Limpando...');
  supabase.removeChannel(channel);
  
  return receivedBroadcast;
}

async function main() {
  try {
    const success = await testTrigger();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📋 Resultado: ${success ? '✅ FUNCIONANDO' : '❌ COM PROBLEMAS'}`);
    console.log('='.repeat(60));
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
