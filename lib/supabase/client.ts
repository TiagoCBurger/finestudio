import { createBrowserClient } from '@supabase/ssr';
import { realtimeLogger } from '@/lib/realtime-logger';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Configure log level based on environment using the logger utility
  // Development: 'info' for detailed debugging
  // Production: 'error' to minimize logs
  const logLevel = realtimeLogger.getSupabaseLogLevel();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        log_level: logLevel,
        eventsPerSecond: 10
      },
      // Configurações otimizadas para prevenir timeouts
      // Timeout aumentado para 30 segundos para dar mais tempo para subscrições
      timeout: 30000,

      // Heartbeat a cada 30 segundos para manter conexão ativa
      heartbeatIntervalMs: 30000,

      // Exponential backoff para reconnection: 1s, 2s, 4s, 8s, 16s, max 30s
      reconnectAfterMs: (tries: number) => {
        const delay = Math.min(1000 * Math.pow(2, tries), 30000);
        realtimeLogger.info('Reconnection attempt', { tries, delay });
        return delay;
      }
    }
  });
};
