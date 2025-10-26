'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RealtimeConnectionManager } from '@/lib/realtime-connection-manager';
import { realtimeLogger } from '@/lib/realtime-logger';

interface RealtimeManagerProviderProps {
    children: React.ReactNode;
    accessToken: string | null;
}

/**
 * Provider to initialize RealtimeConnectionManager
 * Must be placed after authentication is available
 */
export function RealtimeManagerProvider({ children, accessToken }: RealtimeManagerProviderProps) {
    useEffect(() => {
        if (!accessToken) {
            realtimeLogger.warn('No access token available, skipping Realtime initialization');
            return;
        }

        // Create Supabase client
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Initialize RealtimeConnectionManager
        const manager = RealtimeConnectionManager.getInstance();

        // The manager automatically initializes the Supabase client when needed
        realtimeLogger.info('RealtimeConnectionManager ready');
    }, [accessToken]);

    return <>{children}</>;
}
