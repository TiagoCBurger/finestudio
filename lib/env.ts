import { vercel } from '@t3-oss/env-core/presets-zod';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  extends: [vercel()],
  server: {
    // Redis removido - sem rate limiting
    // Resend opcional - apenas se quiser emails
    RESEND_TOKEN: z.string().min(1).startsWith('re_').optional(),
    RESEND_EMAIL: z.string().email().min(1).optional(),

    // Stripe removido - sem sistema de cobrança

    // Supabase Integration (Obrigatório)
    POSTGRES_URL: z.string().url().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), // Opcional - não usado atualmente
    SUPABASE_AUTH_HOOK_SECRET: z.string().min(1).optional(),

    // Cloudflare R2 Configuration
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.string().url().optional(),

    // Fal.ai (Obrigatório)
    FAL_API_KEY: z.string().min(1),

    // Kie.ai (Opcional)
    KIE_API_KEY: z.string().min(1).optional(),

    // Opcional - Outros providers de IA
    OPENAI_API_KEY: z.string().min(1).startsWith('sk-').optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    XAI_API_KEY: z.string().min(1).startsWith('xai-').optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    HUME_API_KEY: z.string().min(1).optional(),
    LMNT_API_KEY: z.string().min(1).optional(),
    MINIMAX_GROUP_ID: z.string().min(1).optional(),
    MINIMAX_API_KEY: z.string().min(1).optional(),
    RUNWAYML_API_SECRET: z.string().min(1).startsWith('key_').optional(),
    LUMA_API_KEY: z.string().min(1).startsWith('luma-').optional(),
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  },
  client: {
    // Opcional - Analytics e Captcha
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().min(1).optional(),

    // Supabase Integration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    POSTGRES_URL: process.env.POSTGRES_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    MINIMAX_GROUP_ID: process.env.MINIMAX_GROUP_ID,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    // Redis removido
    RESEND_TOKEN: process.env.RESEND_TOKEN,
    RESEND_EMAIL: process.env.RESEND_EMAIL,
    // Stripe removido
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_AUTH_HOOK_SECRET: process.env.SUPABASE_AUTH_HOOK_SECRET,
    // R2 Storage
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    RUNWAYML_API_SECRET: process.env.RUNWAYML_API_SECRET,
    LUMA_API_KEY: process.env.LUMA_API_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    HUME_API_KEY: process.env.HUME_API_KEY,
    LMNT_API_KEY: process.env.LMNT_API_KEY,
    FAL_API_KEY: process.env.FAL_API_KEY,
    KIE_API_KEY: process.env.KIE_API_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  },
});
