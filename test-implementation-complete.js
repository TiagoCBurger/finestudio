#!/usr/bin/env node

/**
 * Teste da implementação completa do Gemini 2.5 Flash Image
 * 
 * Este teste simula como o modelo seria usado na aplicação real,
 * incluindo o download e processamento da imagem.
 */

import { config } from 'dotenv';

config();

// Simular a função createOpenRouterImageModel
function createOpenRouterImageModel(modelId) {
    return {
        modelId,
        provider: 'openrouter',
        specificationVersion: 'v2',
        maxImagesPerCall: 1,
        
        doGenerate: async ({ prompt, n = 1 }) => {
            if (!process.env.OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY is required for OpenRouter image generation');
            }

            const warnings = [];

            const messages = [
                {
                    role: 'system',
                    content: 'You are an AI that generates images. When asked to create an image, you should generate and return the actual image, not just a description.'
                },
                {
                    role: 'user',
                    content: `Create a high-quality image with the following description: ${prompt}`
                }
            ];

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
                        model: modelId,
                        messages,
                        max_tokens: 4000,
                        temperature: 0.7,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                const messageImages = data.choices?.[0]?.message?.images;
                let images = [];

                if (messageImages && Array.isArray(messageImages) && messageImages.length > 0) {
                    for (const imageData of messageImages.slice(0, n)) {
                        try {
                            let imageUrl = null;
                            
                            if (imageData.image_url) {
                                imageUrl = imageData.image_url;
                            } else if (imageData.url) {
                        