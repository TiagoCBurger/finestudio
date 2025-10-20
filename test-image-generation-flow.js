#!/usr/bin/env node

/**
 * Teste do Fluxo de Geração de Imagem
 * 
 * Este script simula o fluxo completo:
 * 1. Geração de imagem via fal.ai (webhook)
 * 2. Atualização do projeto via webhook
 * 3. Notificação via realtime
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

console.log('🧪 Teste do Fluxo de Geração de Imagem\n');

// ID do projeto existente
const PROJECT_ID = 'cd882720-e06d-4a9e-8a13-a7d268871652';
const NODE_ID = 'test-image-node-' + Date.now();

async function testImageGenerationFlow() {
  console.log('📡 Testando fluxo completo de geração de imagem...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Buscar projeto atual
  console.log('\n1️⃣ Buscando projeto atual...');
  const { data: project, error: projectError } = await supabase
    .from('project')
    .select('id, name, content')
    .eq('id', PROJECT_ID)
    .single();
    
  if (projectError) {
    console.error('❌ Erro ao buscar projeto:', projectError.message);
    return;
  }
  
  console.log('✅ Projeto encontrado:', project.name);
  
  // 2. Configurar listener do realtime
  console.log('\n2️⃣ Configurando listener do realtime...');
  
  let realtimeUpdates = [];
  
  const channel = supabase
    .channel(`project:${PROJECT_ID}`, {
      config: {
        broadcast: {
          self: false,
          ack: true
        },
        private: false,
      },
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      console.log('📨 Atualização recebida via realtime:', {
        type: payload.payload?.type,
        timestamp: payload.payload?.timestamp,
        id: payload.payload?.id
      });
      realtimeUpdates.push(payload);
    });
  
  // 3. Subscrever ao canal
  console.log('🔌 Subscrevendo ao canal...');
  
  await new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      console.log(`🔌 Status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Conectado ao realtime!');
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Connection failed: ${status}`));
      }
    });
  });
  
  // 4. Simular estado inicial: nó em loading
  console.log('\n3️⃣ Simulando estado inicial (nó em loading)...');
  
  const currentContent = project.content || { nodes: [], edges: [], viewport: {} };
  
  // Adicionar nó de imagem em estado de loading
  const imageNode = {
    id: NODE_ID,
    type: 'image-transform',
    position: { x: 100, y: 100 },
    data: {
      instructions: 'Test image generation',
      model: 'fal-nano-banana',
      // Estado inicial: sem imagem gerada
      updatedAt: new Date().toISOString()
    }
  };
  
  const updatedContent = {
    ...currentContent,
    nodes: [...(currentContent.nodes || []), imageNode]
  };
  
  const { error: initialUpdateError } = await supabase
    .from('project')
    .update({ 
      content: updatedContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', PROJECT_ID);
  
  if (initialUpdateError) {
    console.error('❌ Erro ao adicionar nó inicial:', initialUpdateError.message);
    return;
  }
  
  console.log('✅ Nó de imagem adicionado (estado loading)');
  
  // Aguardar realtime
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 5. Simular webhook completando: nó com imagem
  console.log('\n4️⃣ Simulando webhook completando (imagem gerada)...');
  
  // Atualizar nó com imagem gerada
  const completedNode = {
    ...imageNode,
    data: {
      ...imageNode.data,
      generated: {
        url: 'https://example.com/generated-image.png',
        type: 'image/png'
      },
      updatedAt: new Date().toISOString()
    }
  };
  
  const completedContent = {
    ...updatedContent,
    nodes: updatedContent.nodes.map(node => 
      node.id === NODE_ID ? completedNode : node
    )
  };
  
  const { error: completedUpdateError } = await supabase
    .from('project')
    .update({ 
      content: completedContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', PROJECT_ID);
  
  if (completedUpdateError) {
    console.error('❌ Erro ao completar nó:', completedUpdateError.message);
    return;
  }
  
  console.log('✅ Nó atualizado com imagem gerada');
  
  // Aguardar realtime
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 6. Verificar se recebemos as atualizações
  console.log('\n5️⃣ Verificando atualizações recebidas...');
  
  console.log(`📊 Total de atualizações recebidas: ${realtimeUpdates.length}`);
  
  if (realtimeUpdates.length >= 2) {
    console.log('✅ Fluxo completo funcionando!');
    console.log('  • Estado inicial (loading) → Realtime ✅');
    console.log('  • Estado final (imagem) → Realtime ✅');
  } else if (realtimeUpdates.length === 1) {
    console.log('⚠️ Apenas uma atualização recebida');
  } else {
    console.log('❌ Nenhuma atualização recebida');
  }
  
  // 7. Limpeza: remover nó de teste
  console.log('\n6️⃣ Limpando nó de teste...');
  
  const cleanContent = {
    ...completedContent,
    nodes: completedContent.nodes.filter(node => node.id !== NODE_ID)
  };
  
  await supabase
    .from('project')
    .update({ 
      content: cleanContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', PROJECT_ID);
  
  console.log('✅ Nó de teste removido');
  
  // Cleanup
  supabase.removeChannel(channel);
  
  return realtimeUpdates.length;
}

async function main() {
  try {
    const updatesReceived = await testImageGenerationFlow();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Resumo do Teste de Geração de Imagem:');
    console.log(`  • Atualizações via realtime: ${updatesReceived}`);
    console.log('  • Fluxo loading → completed: ' + (updatesReceived >= 2 ? '✅' : '❌'));
    console.log('  • Sistema realtime: ' + (updatesReceived > 0 ? '✅ Funcionando' : '❌ Com problemas'));
    console.log('='.repeat(60));
    
    if (updatesReceived >= 2) {
      console.log('\n🎉 O sistema está funcionando corretamente!');
      console.log('   O problema pode estar no componente React, não no realtime.');
    } else {
      console.log('\n⚠️ Possível problema no sistema realtime.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

main();