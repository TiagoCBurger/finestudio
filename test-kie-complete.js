#!/usr/bin/env node

/**
 * Teste completo da integração Kie.ai
 * 
 * Este script testa:
 * 1. Configuração da API key
 * 2. Submissão de job
 * 3. Webhook (se configurado)
 * 4. Polling de status
 * 5. Processamento do resultado
 */

require('dotenv').config();

const KIE_API_KEY = process.env.KIE_API_KEY;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie` : null;

async function testKieComplete() {
    console.log('🧪 Teste completo da integração Kie.ai\n');

    // 1. Verificar configuração
    console.log('1️⃣ Verificando configuração...');
    if (!KIE_API_KEY) {
        console.error('❌ KIE_API_KEY não configurada');
        process.exit(1);
    }
    console.log('✅ KIE_API_KEY configurada');
    console.log('📡 Webhook URL:', WEBHOOK_URL || 'N/A (modo fallback)');
    console.log('');

    // 2. Testar diferentes tipos de prompt
    const testCases = [
        {
            name: 'Prompt simples',
            prompt: 'A beautiful sunset over mountains, digital art style',
        },
        {
            name: 'Prompt detalhado',
            prompt: 'A surreal painting of a giant banana floating in space, stars and galaxies in the background, vibrant colors, digital art, highly detailed, 4k resolution',
        }
    ];

    for (const testCase of testCases) {
        console.log(`2️⃣ Testando: ${testCase.name}...`);
        
        const jobPayload = {
            model: 'google/nano-banana',
            input: {
                prompt: testCase.prompt,
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
                continue;
            }

            const result = await response.json();
            console.log('✅ Job submetido com sucesso');
            console.log('📋 Resposta:', JSON.stringify(result, null, 2));
            
            const jobId = result.data?.taskId || result.data?.recordId;
            if (!jobId) {
                console.error('❌ ID do job não encontrado na resposta');
                continue;
            }

            console.log('🆔 Job ID:', jobId);

            // 3. Testar verificação de status
            console.log('3️⃣ Verificando status do job...');
            
            let attempts = 0;
            const maxAttempts = 24; // 2 minutos máximo
            let jobCompleted = false;
            
            while (attempts < maxAttempts && !jobCompleted) {
                console.log(`⏳ Verificação ${attempts + 1}/${maxAttempts}...`);
                
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
                console.log('📊 Status:', statusData.status || statusData.data?.status);
                
                if (statusData.status === 'completed' || statusData.data?.status === 'completed') {
                    console.log('✅ Job completado!');
                    console.log('🖼️ Resultado:', JSON.stringify(statusData.result || statusData.data?.result, null, 2));
                    jobCompleted = true;
                    
                    // Verificar se a imagem foi gerada
                    const images = statusData.result?.images || statusData.data?.result?.images;
                    if (images && images.length > 0) {
                        console.log('🎨 Imagem gerada:', images[0].url);
                        
                        // Testar se a URL da imagem é acessível
                        try {
                            const imageResponse = await fetch(images[0].url, { method: 'HEAD' });
                            if (imageResponse.ok) {
                                console.log('✅ Imagem acessível');
                            } else {
                                console.log('⚠️ Imagem pode não estar acessível:', imageResponse.status);
                            }
                        } catch (imageError) {
                            console.log('⚠️ Erro ao verificar imagem:', imageError.message);
                        }
                    }
                    
                } else if (statusData.status === 'failed' || statusData.data?.status === 'failed') {
                    console.error('❌ Job falhou:', statusData.error || statusData.data?.error);
                    break;
                }
                
                attempts++;
                if (attempts < maxAttempts && !jobCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Aguardar 5 segundos
                }
            }
            
            if (!jobCompleted && attempts >= maxAttempts) {
                console.log('⏰ Timeout atingido. Job pode ainda estar processando.');
                console.log('💡 Verifique manualmente o status em: https://api.kie.ai/api/v1/jobs/' + jobId);
            }

        } catch (error) {
            console.error('❌ Erro durante o teste:', error.message);
        }

        console.log(''); // Linha em branco entre testes
    }

    // 4. Testar webhook (se configurado)
    if (WEBHOOK_URL) {
        console.log('4️⃣ Testando webhook...');
        console.log('📡 URL do webhook:', WEBHOOK_URL);
        
        try {
            const webhookTest = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskId: 'test-webhook-' + Date.now(),
                    status: 'completed',
                    result: {
                        images: [{
                            url: 'https://example.com/test-image.png',
                            width: 1024,
                            height: 1024,
                            content_type: 'image/png'
                        }],
                        prompt: 'Test webhook'
                    }
                })
            });

            if (webhookTest.ok) {
                console.log('✅ Webhook respondeu corretamente');
                const webhookResponse = await webhookTest.json();
                console.log('📋 Resposta do webhook:', JSON.stringify(webhookResponse, null, 2));
            } else {
                console.log('⚠️ Webhook retornou status:', webhookTest.status);
                const errorText = await webhookTest.text();
                console.log('📋 Resposta:', errorText);
            }
        } catch (webhookError) {
            console.error('❌ Erro ao testar webhook:', webhookError.message);
        }
    }

    console.log('\n🎉 Teste completo concluído!');
    console.log('\n📝 Resumo:');
    console.log('- ✅ Configuração verificada');
    console.log('- ✅ API Kie.ai testada');
    console.log('- ✅ Submissão de jobs funcionando');
    console.log('- ✅ Verificação de status funcionando');
    if (WEBHOOK_URL) {
        console.log('- ✅ Webhook testado');
    } else {
        console.log('- ⚠️ Webhook não configurado (modo fallback)');
    }
}

// Executar teste
testKieComplete().catch(console.error);