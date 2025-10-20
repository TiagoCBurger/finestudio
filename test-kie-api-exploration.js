#!/usr/bin/env node

/**
 * Exploração da API Kie.ai para entender melhor os endpoints
 */

require('dotenv').config();

const KIE_API_KEY = process.env.KIE_API_KEY;

async function exploreKieAPI() {
    console.log('🔍 Explorando API Kie.ai...\n');

    if (!KIE_API_KEY) {
        console.error('❌ KIE_API_KEY não configurada');
        process.exit(1);
    }

    // 1. Testar diferentes endpoints de status
    const jobId = 'test-job-id';
    const statusEndpoints = [
        `https://api.kie.ai/api/v1/jobs/${jobId}`,
        `https://api.kie.ai/api/v1/jobs/status/${jobId}`,
        `https://api.kie.ai/api/v1/task/${jobId}`,
        `https://api.kie.ai/api/v1/tasks/${jobId}`,
        `https://api.kie.ai/v1/jobs/${jobId}`,
        `https://api.kie.ai/v1/tasks/${jobId}`,
    ];

    console.log('1️⃣ Testando endpoints de status...');
    for (const endpoint of statusEndpoints) {
        try {
            console.log(`🔗 Testando: ${endpoint}`);
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${KIE_API_KEY}`
                }
            });
            
            console.log(`   Status: ${response.status}`);
            if (response.status !== 404) {
                const text = await response.text();
                console.log(`   Resposta: ${text.substring(0, 200)}...`);
            }
        } catch (error) {
            console.log(`   Erro: ${error.message}`);
        }
        console.log('');
    }

    // 2. Testar endpoint de listagem de jobs (se existir)
    console.log('2️⃣ Testando endpoints de listagem...');
    const listEndpoints = [
        'https://api.kie.ai/api/v1/jobs',
        'https://api.kie.ai/api/v1/tasks',
        'https://api.kie.ai/v1/jobs',
        'https://api.kie.ai/v1/tasks',
    ];

    for (const endpoint of listEndpoints) {
        try {
            console.log(`🔗 Testando: ${endpoint}`);
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${KIE_API_KEY}`
                }
            });
            
            console.log(`   Status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`);
            } else if (response.status !== 404) {
                const text = await response.text();
                console.log(`   Resposta: ${text.substring(0, 200)}...`);
            }
        } catch (error) {
            console.log(`   Erro: ${error.message}`);
        }
        console.log('');
    }

    // 3. Testar endpoint de informações da conta/API
    console.log('3️⃣ Testando endpoints de informações...');
    const infoEndpoints = [
        'https://api.kie.ai/api/v1/account',
        'https://api.kie.ai/api/v1/user',
        'https://api.kie.ai/api/v1/info',
        'https://api.kie.ai/api/v1/models',
        'https://api.kie.ai/v1/models',
    ];

    for (const endpoint of infoEndpoints) {
        try {
            console.log(`🔗 Testando: ${endpoint}`);
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${KIE_API_KEY}`
                }
            });
            
            console.log(`   Status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`);
            } else if (response.status !== 404) {
                const text = await response.text();
                console.log(`   Resposta: ${text.substring(0, 200)}...`);
            }
        } catch (error) {
            console.log(`   Erro: ${error.message}`);
        }
        console.log('');
    }

    // 4. Submeter um job real e tentar diferentes formas de verificar status
    console.log('4️⃣ Submetendo job real para teste...');
    try {
        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KIE_API_KEY}`
            },
            body: JSON.stringify({
                model: 'google/nano-banana',
                input: {
                    prompt: 'A simple test image',
                    output_format: 'png',
                    image_size: '1:1'
                }
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Job submetido:', JSON.stringify(result, null, 2));
            
            const jobId = result.data?.taskId || result.data?.recordId;
            if (jobId) {
                console.log(`🆔 Job ID: ${jobId}`);
                
                // Tentar diferentes formas de verificar este job específico
                console.log('\n5️⃣ Testando status do job real...');
                const realStatusEndpoints = [
                    `https://api.kie.ai/api/v1/jobs/${jobId}`,
                    `https://api.kie.ai/api/v1/jobs/status/${jobId}`,
                    `https://api.kie.ai/api/v1/task/${jobId}`,
                    `https://api.kie.ai/api/v1/tasks/${jobId}`,
                    `https://api.kie.ai/api/v1/jobs/getTask/${jobId}`,
                    `https://api.kie.ai/api/v1/getTask/${jobId}`,
                ];

                for (const endpoint of realStatusEndpoints) {
                    try {
                        console.log(`🔗 Testando: ${endpoint}`);
                        const statusResponse = await fetch(endpoint, {
                            headers: {
                                'Authorization': `Bearer ${KIE_API_KEY}`
                            }
                        });
                        
                        console.log(`   Status: ${statusResponse.status}`);
                        if (statusResponse.ok) {
                            const statusData = await statusResponse.json();
                            console.log(`   ✅ Sucesso! Resposta: ${JSON.stringify(statusData, null, 2)}`);
                        } else if (statusResponse.status !== 404) {
                            const text = await statusResponse.text();
                            console.log(`   Resposta: ${text.substring(0, 200)}...`);
                        }
                    } catch (error) {
                        console.log(`   Erro: ${error.message}`);
                    }
                    console.log('');
                }
            }
        } else {
            console.log('❌ Erro ao submeter job:', response.status);
            const text = await response.text();
            console.log('Resposta:', text);
        }
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }

    console.log('\n🎉 Exploração concluída!');
}

// Executar exploração
exploreKieAPI().catch(console.error);