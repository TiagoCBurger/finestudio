#!/usr/bin/env node

/**
 * Test script to verify KIE video API with different image URL formats
 */

const KIE_API_KEY = process.env.KIE_API_KEY;

if (!KIE_API_KEY) {
    console.error('❌ KIE_API_KEY not set');
    process.exit(1);
}

// Test URLs - diferentes formatos
const testUrls = [
    // URL pública com extensão clara
    'https://file.aiquickdraw.com/custom-page/akr/section-images/1759211376283gfcw5zcy.png',
    
    // Exemplo de URL do seu storage (substitua com uma real)
    // 'https://your-storage-url.com/files/abc123.png',
];

async function testImageUrl(imageUrl) {
    console.log('\n🧪 Testing image URL:', imageUrl);
    
    // Analisar URL
    const url = new URL(imageUrl);
    console.log('📋 URL parts:', {
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
        hasExtension: /\.(jpg|jpeg|png|webp)$/i.test(url.pathname),
    });

    // Verificar acessibilidade
    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        console.log('✅ Image accessible:', {
            status: response.status,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
        });
    } catch (error) {
        console.error('❌ Image not accessible:', error.message);
        return;
    }

    // Testar com API KIE
    const requestBody = {
        model: 'kling/v2-5-turbo-image-to-video-pro',
        input: {
            prompt: 'A beautiful sunset over the ocean',
            image_url: imageUrl,
            duration: '5',
            negative_prompt: 'blur, distort, and low quality',
            cfg_scale: 0.5,
        },
    };

    console.log('📤 Sending to KIE API...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KIE_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && data.code === 200) {
            console.log('✅ Success! Task ID:', data.data?.taskId);
        } else {
            console.error('❌ API Error:', {
                status: response.status,
                code: data.code,
                message: data.msg,
                fullResponse: data,
            });
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

// Testar todas as URLs
for (const url of testUrls) {
    await testImageUrl(url);
}

console.log('\n✅ Test complete');
