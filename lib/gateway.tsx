import { createGateway } from '@ai-sdk/gateway';
import { env } from './env';

export const gateway = env.AI_GATEWAY_API_KEY
  ? createGateway({
    apiKey: env.AI_GATEWAY_API_KEY,
  })
  : undefined;
