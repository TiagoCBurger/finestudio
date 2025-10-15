/**
 * Script de teste para validar a implementação do modo fila do fal.ai
 * 
 * Este script verifica se:
 * 1. O SDK @fal-ai/client está sendo importado corretamente
 * 2. Os métodos queue.submit e queue.result estão sendo usados
 * 3. A configuração da API key está presente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando implementação do modo fila fal.ai\n');

// Verificar arquivo de imagens
const imagePath = path.join(__dirname, 'lib/models/image/fal.ts');
const imageContent = fs.readFileSync(imagePath, 'utf8');

console.log('📸 Verificando lib/models/image/fal.ts:');
console.log('   ✓ Import do SDK:', imageContent.includes("import * as fal from '@fal-ai/client'") ? '✅' : '❌');
console.log('   ✓ queue.submit:', imageContent.includes('fal.queue.submit') ? '✅' : '❌');
console.log('   ✓ queue.result:', imageContent.includes('fal.queue.result') ? '✅' : '❌');
console.log('   ✓ Credentials inline:', imageContent.includes('credentials: env.FAL_API_KEY') ? '✅' : '❌');
console.log('   ✓ Logs de fila:', imageContent.includes('Fal.ai queue') ? '✅' : '❌');
console.log('   ✓ Sem config():', !imageContent.includes('fal.config({') ? '✅' : '❌');

// Verificar arquivo de vídeos
const videoPath = path.join(__dirname, 'lib/models/video/fal.ts');
const videoContent = fs.readFileSync(videoPath, 'utf8');

console.log('\n🎥 Verificando lib/models/video/fal.ts:');
console.log('   ✓ Import do SDK:', videoContent.includes("import * as falClient from '@fal-ai/client'") ? '✅' : '❌');
console.log('   ✓ queue.submit:', videoContent.includes('falClient.queue.submit') ? '✅' : '❌');
console.log('   ✓ queue.result:', videoContent.includes('falClient.queue.result') ? '✅' : '❌');
console.log('   ✓ Credentials inline:', videoContent.includes('credentials: env.FAL_API_KEY') ? '✅' : '❌');
console.log('   ✓ Logs de fila:', videoContent.includes('Fal.ai video queue') ? '✅' : '❌');
console.log('   ✓ Timeout config:', videoContent.includes('timeout: timeoutMs') ? '✅' : '❌');
console.log('   ✓ Sem config():', !videoContent.includes('falClient.config({') ? '✅' : '❌');

// Verificar se não há mais fetch direto
console.log('\n🔧 Verificando remoção de implementação antiga:');
console.log('   ✓ Sem fetch direto (imagens):', !imageContent.includes('fetch(`https://fal.run/${modelId}`') ? '✅' : '❌');
console.log('   ✓ Sem fetch direto (vídeos):', !videoContent.includes('fetch(`https://fal.run/${modelId}`') ? '✅' : '❌');
console.log('   ✓ Sem polling manual:', !videoContent.includes('while (Date.now() - startTime < maxPollTime)') ? '✅' : '❌');

console.log('\n✨ Verificação completa!\n');
console.log('📚 Para mais informações, consulte: FAL_QUEUE_MODE_IMPLEMENTATION.md');
