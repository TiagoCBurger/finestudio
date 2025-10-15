import { getSubscribedUser } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { textModels } from '@/lib/models/text';
import { env } from '@/lib/env';

export const maxDuration = 30;

// Convert messages to OpenRouter format
function convertMessages(messages: any[]) {
  console.log('RAW MESSAGES RECEIVED:', JSON.stringify(messages, null, 2));
  
  const converted = messages.map((msg, index) => {
    console.log(`Processing message ${index}:`, msg);
    
    // Extract text from various possible formats
    let textContent = '';
    
    // Try different text fields
    if (msg.text) textContent = msg.text;
    else if (msg.content) textContent = msg.content;
    else if (msg.parts && Array.isArray(msg.parts)) {
      // Check if it's coming from the AI SDK format with parts
      const textPart = msg.parts.find((p: any) => p.type === 'text');
      if (textPart) textContent = textPart.text || '';
    }
    
    console.log(`Extracted text for message ${index}:`, textContent);
    
    const content: any[] = [];
    
    // Add text content if available
    if (textContent && textContent.trim()) {
      content.push({ type: 'text', text: textContent.trim() });
    }
    
    // Handle file attachments (images)
    if (msg.files && Array.isArray(msg.files)) {
      for (const file of msg.files) {
        if (file.type?.startsWith('image/') || file.mediaType?.startsWith('image/')) {
          content.push({
            type: 'image_url',
            image_url: { url: file.url }
          });
        }
      }
    }
    
    // Build final message
    let finalContent;
    if (content.length === 1 && content[0].type === 'text') {
      finalContent = content[0].text;
    } else if (content.length > 0) {
      finalContent = content;
    } else if (textContent && textContent.trim()) {
      finalContent = textContent.trim();
    } else {
      finalContent = '';
    }
    
    const result = {
      role: msg.role || 'user',
      content: finalContent
    };
    
    console.log(`Converted message ${index}:`, JSON.stringify(result, null, 2));
    return result;
  }).filter(msg => {
    const hasContent = msg.content && 
      (typeof msg.content === 'string' ? msg.content.trim().length > 0 : 
       Array.isArray(msg.content) ? msg.content.length > 0 : false);
    console.log('Message has content?', hasContent, msg);
    return hasContent;
  });
  
  console.log('FINAL CONVERTED MESSAGES:', JSON.stringify(converted, null, 2));
  
  if (converted.length === 0) {
    throw new Error(`No valid messages with content found. Original messages: ${JSON.stringify(messages)}`);
  }
  
  return converted;
}

// Stream OpenRouter response in Vercel AI SDK format
async function streamOpenRouterResponse(modelId: string, messages: any[]) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://fine.studio',
      'X-Title': 'Fine Studio',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: convertMessages(messages),
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Create a TransformStream to convert OpenRouter SSE to Vercel AI SDK format
  const stream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            // Send completion event
            controller.enqueue(encoder.encode(`0:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.content) {
              // Send text delta in Vercel AI SDK format
              controller.enqueue(encoder.encode(`0:{"textDelta":"${delta.content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n`));
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    },
  });

  response.body?.pipeThrough(stream);
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}

export const POST = async (req: Request) => {
  try {
    await getSubscribedUser();
  } catch (error) {
    const message = parseError(error);
    return new Response(message, { status: 401 });
  }

  try {
    const { messages, modelId } = await req.json();

    console.log('Received request body:', { messages, modelId });

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages must be an array', { status: 400 });
    }

    if (typeof modelId !== 'string') {
      return new Response('Model must be a string', { status: 400 });
    }

    const textModelConfig = textModels[modelId];

    // OpenRouter - Direct API call (NO Vercel AI SDK)
    if (textModelConfig && textModelConfig.provider === 'openrouter') {
      if (!env.OPENROUTER_API_KEY) {
        return new Response('OpenRouter not configured', { status: 503 });
      }

      console.log('API - Using OpenRouter DIRECT API (no SDK) for:', modelId);
      return await streamOpenRouterResponse(modelId, messages);
    }

    return new Response('Model not supported', { status: 400 });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ 
      error: parseError(error),
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
