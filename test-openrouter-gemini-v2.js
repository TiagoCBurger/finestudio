#!/usr/bin/env node

/**
 * Teste do modelo Gemini 2.5 Flash via OpenRouter - Versão 2
 * 
 * Testando diferentes abordagens para geração de imagens
 */

import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

async function testDifferentPrompts() {
    console.log('🤖 Testando diferentes prompts com Gemini 2.5 Flash...\n');

    if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY não encontrada');
        process.exit(1);
    }

    const prompts = [
        // Prompt 1: Texto simples
        {
            name: 'Texto simples',
            content: 'Hello, can you help me?'
        },
        // Prompt 2: Solicitação de descrição de imagem
        {
            name: 'Descrição de imagem',
            content: 'Describe a beautiful sunset over mountains in detail.'
        },
        // Prompt 3: Solicitação explícita de geração
        {
            name: 'Geração explícita',
            content: 'Create and generate an image of a sunset over mountains.'
        },
        // Prompt 4: Usando markdown
        {
            name: 'Markdown format',
            content: 'Please generate an image and return it in markdown format: ![sunset](image_url_here)'
        }
    ];

    for (const prompt of prompts) {
        console.log(`\n🧪 Testando: ${prompt.name}`);
        console.log(`📝 Prompt: ${prompt.content}`);
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://fine.studio',
                    'X-Title': 'Fine Studio',
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        {
                            role: 'user',
                            content: prompt.content
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`❌ Erro: ${response.status} - ${errorText}`);
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            console.log(`📊 Status: ${response.status}`);
            console.log(`📏 Tokens: ${data.usage?.total_tokens || 0}`);
            console.log(`📝 Resposta (${content.length} chars):`, 
                content.length > 100 ? content.substring(0, 100) + '...' : content);
            
            // Verificar se contém URLs ou base64
            const hasUrls = /https?:\/\/[^\s\)]+/gi.test(content);
            const hasBase64 = /data:image\/[^;]+;base64,/gi.test(content);
            
            if (hasUrls) console.log('🔗 Contém URLs');
            if (hasBase64) console.log('🖼️ Contém base64');
            
        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
        
        // Pequena pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function testImageCapableModels() {
    console.log('\n\n🔍 Testando modelos que suportam imagens no OpenRouter...\n');
    
    // Modelos que podem suportar geração de imagens
    const imageModels = [
        'google/gemini-2.5-flash',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'openai/dall-e-3',
        'stability-ai/stable-diffusion-xl'
    ];
    
    for (const model of imageModels) {
        console.log(`\n🤖 Testando modelo: ${model}`);
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://fine.studio',
                    'X-Title': 'Fine Studio',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: 'Generate an image of a cat'
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.7,
                }),
            });

            console.log(`📊 Status: ${response.status}`);
            
            if (response.status === 200) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                console.log(`✅ Funciona! Resposta: ${content.substring(0, 50)}...`);
            } else if (response.status === 402) {
                console.log(`💰 Modelo requer pagamento`);
            } else if (response.status === 404) {
                console.log(`❌ Modelo não encontrado`);
            } else {
                const errorText = await response.text();
                console.log(`❌ Erro: ${errorText.substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
        
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function main() {
    await testDifferentPrompts();
    await testImageCapableModels();
    
    console.log('\n\n📋 Conclusões:');
    console.log('1. Gemini 2.5 Flash parece ser um modelo de texto, não de imagem');
    console.log('2. Para geração de imagens, considere usar:');
    console.log('   - DALL-E 3 (OpenAI)');
    console.log('   - Stable Diffusion XL');
    console.log('   - Midjourney (se disponível)');
    console.log('3. Gemini pode ser usado para descrever imagens ou gerar prompts para outros modelos');
}

main().catch(console.error);