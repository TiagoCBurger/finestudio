#!/usr/bin/env node

/**
 * Teste de integração do provedor Kie.ai
 * 
 * Este script testa:
 * 1. Configuração da API key
 * 2. Submissão de job para a API Kie.ai
 * 3. Verificação do status do job
 * 4. Processamento do resultado
 */

require('dotenv').config();

const KIE_API_KEY = process.env.KIE_API_KEY;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie` : null;

async function testKieIntegration() {
    console.log('🧪 Testando integração com Kie.ai...\n');

    // 1. Verificar configuração
    console.log('1️⃣ Verificando configuração...');
    if (!KIE_API_KEY) {
        console.error('❌ KIE_API_KEY não configurada');
        process.exit(1);
    }
    console.log('✅ KIE_API_KEY configurada');
    console.log('📡 Webhook URL:', WEBHOOK_URL || 'N/A (modo fallback)');
    console.log('');

    // 2. Testar submissão de job
    console.log('2️⃣ Testando submissão de job...');
    
    const jobPayload = {
        model: 'google/nano-banana',
        input: {
            prompt: 'A beautiful sunset over mountains, digital art style',
            output_format: 'png',
            image_size: '1:1'
        }
    };

    if (WEBHOOK_URL) {
        jobPayload.callBackUrl = WEBHOOK_URL;
    }

    try {
        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KIE_API_KEY}`
            },
            body: JSON.stringify(jobPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na submissão:', response.status, response.statusText);
            console.error('Resposta:', errorText);
            process.exit(1);
        }

        const result = await response.json();
        console.log('✅ Job submetido com sucesso');
        console.log('📋 Resposta:', JSON.stringify(result, null, 2));
        
        const jobId = result.data?.taskId || result.data?.recordId || result.id || result.request_id || result.taskId;
        if (!jobId) {
            console.error('❌ ID do job não encontrado na resposta');
            process.exit(1);
        }

        console.log('🆔 Job ID:', jobId);
        console.log('');

        // 3. Se não tiver webhook, testar polling
        if (!WEBHOOK_URL) {
            console.log('3️⃣ Testando polling de status (modo fallback)...');
            
            let attempts = 0;
            const maxAttempts = 12; // 1 minuto máximo
            
            while (attempts < maxAttempts) {
                console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts}...`);
                
                const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${KIE_API_KEY}`
                    }
                });

                if (!statusResponse.ok) {
                    console.error('❌ Erro ao verificar status:', statusResponse.status);
                    break;
                }

                const statusData = await statusResponse.json();
                console.log('📊 Status:', statusData.status);
                
                if (statusData.status === 'completed') {
                    console.log('✅ Job completado!');
                    console.log('🖼️ Resultado:', JSON.stringify(statusData.result, null, 2));
                    break;
                } else if (statusData.status === 'failed') {
                    console.error('❌ Job falhou:', statusData.error);
                    break;
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Aguardar 5 segundos
                }
            }
            
            if (attempts >= maxAttempts) {
                console.log('⏰ Timeout atingido. Job pode ainda estar processando.');
            }
        } else {
            console.log('3️⃣ Modo webhook ativo - aguarde o callback...');
            console.log('💡 Verifique os logs do servidor para ver o webhook sendo processado.');
        }

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        process.exit(1);
    }

    console.log('\n🎉 Teste de integração concluído!');
}

// Executar teste
testKieIntegration().catch(console.error);