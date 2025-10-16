'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mutate } from 'swr';

/**
 * Hook to subscribe to project changes via Supabase Realtime
 * Automatically updates when fal.ai webhook modifies the project
 * 
 * Uses broadcast for better scalability (recommended over postgres_changes)
 */
export function useProjectRealtime(projectId: string | undefined) {
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

    useEffect(() => {
        if (!projectId) return;

        // Prevent duplicate subscriptions
        if (channelRef.current?.state === 'subscribed') {
            console.log('🔴 Already subscribed to project:', projectId);
            return;
        }

        const supabase = createClient();

        console.log('🔴 Subscribing to project realtime updates:', projectId);

        // Use broadcast with private channel for better scalability
        const channel = supabase
            .channel(`project:${projectId}`, {
                config: {
                    broadcast: { self: true, ack: true },
                    private: true, // Requires RLS policies on realtime.messages
                },
            })
            .on(
                'broadcast',
                { event: 'project_updated' },
                (payload) => {
                    console.log('🔴 Project updated via broadcast:', payload);

                    // Revalidate SWR cache to update UI
                    try {
                        mutate(`/api/projects/${projectId}`);
                        console.log('🔴 Project cache revalidated');
                    } catch (error) {
                        console.error('🔴 Error revalidating project:', error);
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('🔴 Realtime subscription status: SUBSCRIBED ✅');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('🔴 Realtime subscription error:', err);
                    // Client will automatically retry
                } else if (status === 'TIMED_OUT') {
                    console.error('🔴 Realtime subscription timed out');
                } else {
                    console.log('🔴 Realtime subscription status:', status);
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            console.log('🔴 Unsubscribing from project realtime');
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [projectId]);
}
