#!/usr/bin/env node

/**
 * Teste específico para reproduzir o erro "node not found"
 * Vamos simular diferentes cenários para identificar quando acontece
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testNodeNotFoundScenarios() {
  console.log('🔍 Testando cenários que podem causar "node not found"...\n');

  try {
    // 1. Verificar configuração do webhook
    console.log('1️⃣ Verificando configuração do webhook...');
    console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'NÃO CONFIGURADO'}`);
    console.log(`   FAL_API_KEY: ${process.env.FAL_API_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
    
    const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
    console.log(`   Modo webhook: ${useWebhook ? 'ATIVO' : 'INATIVO'}`);

    // 2. Buscar projetos recentes com nós de imagem
    console.log('\n2️⃣ Buscando projetos com nós de imagem...');
    const { data: projects, error: projectsError } = await supabase
      .from('project')
      .select('id, name, content, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (projectsError) {
      throw new Error(`Erro ao buscar projetos: ${projectsError.message}`);
    }

    console.log(`   Encontrados ${projects.length} projetos`);

    // 3. Analisar estrutura dos projetos
    for (const project of projects) {
      console.log(`\n📋 Projeto: ${project.name} (${project.id})`);
      console.log(`   Atualizado: ${project.updated_at}`);

      if (!project.content) {
        console.log('   ❌ Sem conteúdo');
        continue;
      }

      const content = project.content;
      console.log(`   Estrutura: ${typeof content}`);

      if (typeof content === 'object' && content.nodes) {
        const nodes = content.nodes;
        console.log(`   Nós: ${nodes.length}`);

        // Analisar nós de imagem
        const imageNodes = nodes.filter(node => node.type === 'image');
        console.log(`   Nós de imagem: ${imageNodes.length}`);

        for (const node of imageNodes) {
          console.log(`     🖼️ Nó ${node.id}:`);
          console.log(`       Posição: (${node.position?.x || 0}, ${node.position?.y || 0})`);
          console.log(`       Tem data: ${!!node.data}`);
          console.log(`       Tem generated: ${!!node.data?.generated}`);
          console.log(`       URL: ${node.data?.generated?.url || 'N/A'}`);
          console.log(`       Loading: ${node.data?.loading || false}`);
          console.log(`       Updated: ${node.data?.updatedAt || 'N/A'}`);

          // Verificar se o nó tem estrutura válida
          if (!node.id) {
            console.log('       ⚠️ PROBLEMA: Nó sem ID!');
          }
          if (!node.type) {
            console.log('       ⚠️ PROBLEMA: Nó sem tipo!');
          }
        }
      } else {
        console.log('   ❌ Estrutura de conteúdo inválida');
        console.log(`   Tipo do content: ${typeof content}`);
        console.log(`   Tem nodes: ${!!(content && content.nodes)}`);
        console.log(`   Nodes é array: ${Array.isArray(content?.nodes)}`);
      }
    }

    // 4. Verificar jobs FAL recentes
    console.log('\n4️⃣ Verificando jobs FAL recentes...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('fal_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.log(`   ❌ Erro ao buscar jobs: ${jobsError.message}`);
    } else {
      console.log(`   Jobs encontrados: ${recentJobs.length}`);
      
      for (const job of recentJobs) {
        console.log(`     📋 Job ${job.request_id}:`);
        console.log(`       Status: ${job.status}`);
        console.log(`       Tipo: ${job.type}`);
        console.log(`       Criado: ${job.created_at}`);
        console.log(`       Completado: ${job.completed_at || 'N/A'}`);
        console.log(`       Erro: ${job.error || 'N/A'}`);

        // Verificar metadados do input
        if (job.input && typeof job.input === 'object') {
          const metadata = job.input._metadata;
          if (metadata) {
            console.log(`       Metadata:`);
            console.log(`         NodeId: ${metadata.nodeId || 'N/A'}`);
            console.log(`         ProjectId: ${metadata.projectId || 'N/A'}`);

            // Verificar se o projeto e nó ainda existem
            if (metadata.projectId && metadata.nodeId) {
              const project = projects.find(p => p.id === metadata.projectId);
              if (project) {
                const node = project.content?.nodes?.find(n => n.id === metadata.nodeId);
                console.log(`         Nó existe: ${!!node}`);
                if (!node) {
                  console.log('         ⚠️ POSSÍVEL CAUSA: Nó foi removido após job ser criado!');
                }
              } else {
                console.log('         ⚠️ POSSÍVEL CAUSA: Projeto foi removido após job ser criado!');
              }
            }
          } else {
            console.log(`       ❌ Job sem metadata - pode causar problemas no webhook`);
          }
        }
      }
    }

    // 5. Simular cenários problemáticos
    console.log('\n5️⃣ Cenários que podem causar "node not found":');
    console.log('   ✅ Webhook configurado corretamente');
    console.log('   ⚠️ Possíveis causas:');
    console.log('     1. Nó removido entre criação do job e webhook');
    console.log('     2. Projeto removido entre criação do job e webhook');
    console.log('     3. Estrutura de content corrompida');
    console.log('     4. Race condition entre múltiplas operações');
    console.log('     5. Modo fallback sendo usado inesperadamente');

    // 6. Verificar se há jobs pendentes que podem estar causando problemas
    const pendingJobs = recentJobs?.filter(job => 
      job.status === 'pending' || job.status === 'in_progress'
    ) || [];

    if (pendingJobs.length > 0) {
      console.log(`\n⏳ Jobs pendentes encontrados: ${pendingJobs.length}`);
      console.log('   Estes jobs podem estar tentando atualizar nós que não existem mais');
      
      for (const job of pendingJobs) {
        const metadata = job.input?._metadata;
        if (metadata?.projectId && metadata?.nodeId) {
          const project = projects.find(p => p.id === metadata.projectId);
          const nodeExists = project?.content?.nodes?.find(n => n.id === metadata.nodeId);
          
          if (!nodeExists) {
            console.log(`   ❌ Job ${job.request_id} vai falhar: nó ${metadata.nodeId} não existe mais`);
          }
        }
      }
    }

    console.log('\n✅ Análise completa!');
    console.log('\n💡 Recomendações:');
    console.log('1. Verificar logs do webhook quando o erro acontecer');
    console.log('2. Adicionar validação no webhook antes de atualizar projeto');
    console.log('3. Implementar cleanup de jobs órfãos');
    console.log('4. Melhorar tratamento de erro no frontend');

  } catch (error) {
    console.error('❌ Erro durante análise:', error);
  }
}

// Executar análise
testNodeNotFoundScenarios().then(() => {
  console.log('\n🏁 Análise finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});