/**
 * Script de Teste: Verificar Conexão Realtime
 * 
 * Execute no console do navegador (F12) para diagnosticar problemas de Realtime
 */

console.log('🔍 Iniciando diagnóstico de Realtime...\n');

// 1. Verificar se Supabase está disponível
if (!window.supabase) {
    console.error('❌ window.supabase não está disponível!');
    console.log('   Certifique-se de que o Supabase client foi inicializado');
} else {
    console.log('✅ Supabase client disponível');
}

// 2. Verificar canais Realtime
const channels = window.supabase?.realtime?.channels || [];
console.log(`\n📡 Canais Realtime ativos: ${channels.length}`);

channels.forEach((channel, index) => {
    console.log(`\n  Canal ${index + 1}:`);
    console.log(`    Topic: ${channel.topic}`);
    console.log(`    Estado: ${channel.state}`);
    console.log(`    Joined: ${channel.state === 'joined' ? '✅' : '❌'}`);
});

// 3. Verificar canal de projeto
const projectChannel = channels.find(c => c.topic.includes('project:'));
if (projectChannel) {
    console.log('\n✅ Canal de projeto encontrado:');
    console.log(`   Topic: ${projectChannel.topic}`);
    console.log(`   Estado: ${projectChannel.state}`);
    if (projectChannel.state !== 'joined') {
        console.warn('   ⚠️ Canal não está conectado (joined)!');
    }
} else {
    console.error('\n❌ Canal de projeto NÃO encontrado!');
    console.log('   O hook use-project-realtime pode não estar sendo executado');
}

// 4. Verificar canal de fila
const queueChannel = channels.find(c => c.topic.includes('fal_jobs:'));
if (queueChannel) {
    console.log('\n✅ Canal de fila encontrado:');
    console.log(`   Topic: ${queueChannel.topic}`);
    console.log(`   Estado: ${queueChannel.state}`);
    if (queueChannel.state !== 'joined') {
        console.warn('   ⚠️ Canal não está conectado (joined)!');
    }
} else {
    console.error('\n❌ Canal de fila NÃO encontrado!');
    console.log('   O hook use-queue-monitor pode não estar sendo executado');
}

// 5. Verificar sessão do usuário
window.supabase?.auth.getSession().then(({ data: { session }, error }) => {
    console.log('\n👤 Sessão do usuário:');
    if (error) {
        console.error(`   ❌ Erro ao obter sessão: ${error.message}`);
    } else if (!session) {
        console.error('   ❌ Nenhuma sessão ativa!');
        console.log('   Usuário precisa estar logado para usar canais privados');
    } else {
        console.log('   ✅ Sessão ativa');
        console.log(`   User ID: ${session.user.id}`);
        console.log(`   Expira em: ${new Date(session.expires_at * 1000).toLocaleString()}`);
    }
});

// 6. Resumo e recomendações
console.log('\n📋 Resumo do Diagnóstico:');
console.log('─'.repeat(50));

const issues = [];

if (!window.supabase) {
    issues.push('Supabase client não inicializado');
}

if (channels.length === 0) {
    issues.push('Nenhum canal Realtime ativo');
}

if (!projectChannel) {
    issues.push('Canal de projeto não encontrado');
} else if (projectChannel.state !== 'joined') {
    issues.push('Canal de projeto não conectado');
}

if (!queueChannel) {
    issues.push('Canal de fila não encontrado');
} else if (queueChannel.state !== 'joined') {
    issues.push('Canal de fila não conectado');
}

if (issues.length === 0) {
    console.log('✅ Tudo parece estar funcionando!');
    console.log('\nSe ainda assim não está atualizando:');
    console.log('1. Verifique os logs do servidor (webhook completando)');
    console.log('2. Verifique se triggers estão disparando no banco');
    console.log('3. Verifique RLS policies no Supabase');
} else {
    console.log('❌ Problemas encontrados:');
    issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n🔧 Ações recomendadas:');
    console.log('1. Recarregue a página (F5)');
    console.log('2. Verifique se está logado');
    console.log('3. Verifique console por erros de subscription');
}

console.log('\n' + '─'.repeat(50));
console.log('💡 Para mais detalhes, procure por:');
console.log('   - "SUBSCRIBED" (conexão bem-sucedida)');
console.log('   - "CHANNEL_ERROR" (erro de conexão)');
console.log('   - "Job update received" (fila atualizando)');
console.log('   - "Broadcast received" (projeto atualizando)');
