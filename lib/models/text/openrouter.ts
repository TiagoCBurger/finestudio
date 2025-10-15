// OpenRouter configuration - Direct API (NO Vercel AI SDK)
import { env } from '@/lib/env';

export const openrouterConfig = {
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://fine.studio',
    'X-Title': 'Fine Studio',
  },
};
