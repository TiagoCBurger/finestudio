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

        // Check if already initialized
        if (!(manager as any).supabaseClient) {
            realtimeLogger.info('Initializing RealtimeConnectionManager');
            manager.initialize(supabase, accessToken);
            realtimeLogger.success('RealtimeConnectionManager initialized');
        } else {
            // Update token if already initialized
            realtimeLogger.info('Updating Realtime auth token');
            (manager as any).handleSignIn(accessToken);
        }
    }, [accessToken]);

    return <>{children}</>;
}
