#!/usr/bin/env node

/**
 * Teste completo do fluxo de geração de imagem
 * Verifica se o problema "failed to load image" ainda persiste
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testImageGeneration() {
  console.log('🧪 Testando fluxo completo de geração de imagem...\n');

  try {
    // 1. Verificar se temos projetos com nós de imagem
    console.log('1️⃣ Buscando projetos com nós de imagem...');
    const { data: projects, error: projectsError } = await supabase
      .from('project')
      .select('id, name, content')
      .limit(5);

    if (projectsError) {
      throw new Error(`Erro ao buscar projetos: ${projectsError.message}`);
    }

    console.log(`✅ Encontrados ${projects.length} projetos`);

    // Encontrar projeto com nós de imagem
    let projectWithImages = null;
    let imageNodes = [];

    for (const project of projects) {
      if (project.content?.nodes) {
        const nodes = project.content.nodes;
        const imgNodes = nodes.filter(node => 
          node.type === 'image' && 
          node.data?.generated?.url
        );
        
        if (imgNodes.length > 0) {
          projectWithImages = project;
          imageNodes = imgNodes;
          break;
        }
      }
    }

    if (!projectWithImages) {
      console.log('⚠️ Nenhum projeto com imagens geradas encontrado');
      return;
    }

    console.log(`✅ Projeto encontrado: ${projectWithImages.name}`);
    console.log(`✅ Nós de imagem: ${imageNodes.length}`);

    // 2. Testar URLs das imagens
    console.log('\n2️⃣ Testando URLs das imagens...');
    
    for (let i = 0; i < imageNodes.length; i++) {
      const node = imageNodes[i];
      const url = node.data?.generated?.url;
      
      if (!url) {
        console.log(`❌ Nó ${node.id}: URL vazia`);
        continue;
      }

      console.log(`🔍 Testando nó ${node.id}:`);
      console.log(`   URL: ${url}`);
      console.log(`   Updated: ${node.data?.updatedAt || 'N/A'}`);

      try {
        // Fazer requisição HEAD para verificar se a imagem existe
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          console.log(`   ✅ Status: ${response.status} - Imagem acessível`);
          console.log(`   📏 Content-Length: ${response.headers.get('content-length') || 'N/A'}`);
          console.log(`   🎨 Content-Type: ${response.headers.get('content-type') || 'N/A'}`);
        } else {
          console.log(`   ❌ Status: ${response.status} - Imagem não acessível`);
          console.log(`   📝 Status Text: ${response.statusText}`);
        }
      } catch (fetchError) {
        console.log(`   ❌ Erro ao acessar URL: ${fetchError.message}`);
      }
    }

    // 3. Verificar logs do Supabase para erros relacionados
    console.log('\n3️⃣ Verificando logs do Supabase...');
    
    // Verificar logs da API
    console.log('📋 Logs da API (últimas 24h):');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/logs`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        const logs = await response.json();
        const imageLogs = logs.filter(log => 
          log.msg?.includes('image') || 
          log.msg?.includes('fal') ||
          log.path?.includes('image')
        );
        
        console.log(`   📊 Total de logs relacionados a imagem: ${imageLogs.length}`);
        
        if (imageLogs.length > 0) {
          console.log('   🔍 Últimos logs relevantes:');
          imageLogs.slice(-3).forEach(log => {
            console.log(`     ${log.timestamp}: ${log.msg || log.path}`);
          });
        }
      }
    } catch (logError) {
      console.log(`   ⚠️ Não foi possível acessar logs: ${logError.message}`);
    }

    // 4. Verificar fal_jobs para jobs pendentes ou com erro
    console.log('\n4️⃣ Verificando fal_jobs...');
    
    const { data: falJobs, error: falJobsError } = await supabase
      .from('fal_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (falJobsError) {
      console.log(`   ❌ Erro ao buscar fal_jobs: ${falJobsError.message}`);
    } else {
      console.log(`   📊 Total de jobs encontrados: ${falJobs.length}`);
      
      const statusCounts = falJobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   📈 Status dos jobs:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });

      // Mostrar jobs com erro
      const errorJobs = falJobs.filter(job => job.status === 'failed');
      if (errorJobs.length > 0) {
        console.log('\n   ❌ Jobs com erro:');
        errorJobs.forEach(job => {
          console.log(`     ID: ${job.request_id}`);
          console.log(`     Erro: ${job.error || 'N/A'}`);
          console.log(`     Criado: ${job.created_at}`);
        });
      }
    }

    // 5. Testar realtime para atualizações de projeto
    console.log('\n5️⃣ Testando Realtime...');
    
    const channel = supabase.channel(`project:${projectWithImages.id}`, {
      config: { private: true }
    });

    let realtimeWorking = false;
    
    channel
      .on('broadcast', { event: 'project_updated' }, (payload) => {
        console.log('   ✅ Realtime funcionando - projeto atualizado:', payload);
        realtimeWorking = true;
      })
      .subscribe((status) => {
        console.log(`   📡 Status do Realtime: ${status}`);
      });

    // Aguardar um pouco para ver se há atualizações
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!realtimeWorking) {
      console.log('   ⚠️ Nenhuma atualização Realtime detectada (normal se não houver atividade)');
    }

    await supabase.removeChannel(channel);

    console.log('\n✅ Teste completo finalizado!');
    console.log('\n📋 Resumo dos possíveis problemas:');
    console.log('1. URLs de imagem inacessíveis (verificar logs acima)');
    console.log('2. Jobs FAL com status failed');
    console.log('3. Problemas de conectividade de rede');
    console.log('4. Cache do navegador com URLs antigas');
    console.log('5. Problemas de CORS ou headers de segurança');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
testImageGeneration().then(() => {
  console.log('\n🏁 Teste finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});