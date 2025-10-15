import { getSubscribedUser } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { textModels } from '@/lib/models/text';
import { env } from '@/lib/env';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Convert messages to OpenRouter format
function convertMessages(messages: any[]) {
  return messages.map((msg) => ({
    role: msg.role || 'user',
    content: msg.text || msg.content || '',
  }));
}

// Stream OpenRouter response in Vercel AI SDK format
async function streamOpenRouterCodeResponse(modelId: string, messages: any[], language: string) {
  const systemMessage = [
    `Output the code in the language specified: ${language ?? 'javascript'}`,
    'If the user specifies an output language in the context below, ignore it.',
    'Respond with the code only, no other text.',
    'Do not format the code as Markdown, just return the code as is.',
  ].join('\n');

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
      messages: [
        { role: 'system', content: systemMessage },
        ...convertMessages(messages)
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const stream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode(`0:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.content) {
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
    const { messages, modelId, language } = await req.json();

    if (typeof modelId !== 'string') {
      return new Response('Model must be a string', { status: 400 });
    }

    const textModelConfig = textModels[modelId];

    // OpenRouter - direct API call
    if (textModelConfig && textModelConfig.provider === 'openrouter') {
      if (!env.OPENROUTER_API_KEY) {
        return new Response('OpenRouter not configured', { status: 503 });
      }

      console.log('API - Using OpenRouter direct API for code generation:', modelId);
      return await streamOpenRouterCodeResponse(modelId, messages, language);
    }

    return new Response('Model not supported', { status: 400 });
  } catch (error) {
    console.error('Error in code API:', error);
    return new Response(JSON.stringify({ 
      error: parseError(error),
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
