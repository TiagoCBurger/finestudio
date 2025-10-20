#!/usr/bin/env node

/**
 * Teste Manual do Realtime
 * 
 * Este script testa o realtime com dados reais do projeto
 * Simula uma atualização via webhook para verificar se o realtime funciona
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

console.log('🧪 Teste Manual do Realtime\n');
console.log('🌐 Supabase URL:', supabaseUrl);

// ID do projeto existente
const PROJECT_ID = 'cd882720-e06d-4a9e-8a13-a7d268871652';

async function testRealtimeWithRealData() {
  console.log('\n📡 Testando Realtime com dados reais...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Verificar se o projeto existe
  console.log('\n1️⃣ Verificando projeto existente...');
  const { data: project, error: projectError } = await supabase
    .from('project')
    .select('id, name, user_id')
    .eq('id', PROJECT_ID)
    .single();
    
  if (projectError) {
    console.error('❌ Erro ao buscar projeto:', projectError.message);
    return;
  }
  
  console.log('✅ Projeto encontrado:', {
    id: project.id,
    name: project.name,
    user_id: project.user_id
  });
  
  // 2. Configurar listener do realtime
  console.log('\n2️⃣ Configurando listener do realtime...');
  
  let messageReceived = false;
  
  const channel = supabase
    .channel(`project:${PROJECT_ID}`, {
      config: {
        broadcast: {
          self: false,
          ack: true
        },
        private: false, // Usar público para teste
      },
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      console.log('📨 Mensagem recebida via realtime:', payload);
      messageReceived = true;
    });
  
  // 3. Subscrever ao canal
  console.log('🔌 Subscrevendo ao canal...');
  
  const subscriptionPromise = new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      console.log(`🔌 Status da conexão: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Conectado ao canal realtime!');
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Erro na conexão:', err?.message || status);
        reject(new Error(`Connection failed: ${status}`));
      }
    });
  });
  
  try {
    // Aguardar conexão
    await subscriptionPromise;
    
    // 4. Simular atualização via trigger (como o webhook faria)
    console.log('\n3️⃣ Simulando atualização do projeto...');
    
    const { error: updateError } = await supabase
      .from('project')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', PROJECT_ID);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar projeto:', updateError.message);
      return;
    }
    
    console.log('✅ Projeto atualizado no banco de dados');
    
    // 5. Aguardar mensagem do realtime
    console.log('\n4️⃣ Aguardando mensagem do realtime...');
    
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (messageReceived) {
          console.log('✅ Mensagem recebida com sucesso!');
        } else {
          console.log('⚠️ Nenhuma mensagem recebida em 5 segundos');
        }
        resolve();
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Limpando conexões...');
    supabase.removeChannel(channel);
  }
}

async function main() {
  try {
    await testRealtimeWithRealData();
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Resumo do Teste:');
    console.log('  • Projeto verificado');
    console.log('  • Canal realtime configurado');
    console.log('  • Atualização simulada');
    console.log('  • Resultado verificado');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

main();