'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mutate } from 'swr';

/**
 * Hook para subscrever às mudanças do projeto via Supabase Realtime
 * Atualiza automaticamente quando o webhook do fal.ai modifica o projeto
 */
export function useProjectRealtime(projectId: string | undefined) {
    useEffect(() => {
        if (!projectId) return;

        const supabase = createClient();

        console.log('🔴 Subscribing to project realtime updates:', projectId);

        // Subscrever às mudanças na tabela project (não projects!)
        const channel = supabase
            .channel(`project:${projectId}`, {
                config: {
                    broadcast: { self: true },
                    presence: { key: projectId },
                },
            })
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'project', // Nome correto da tabela
                    filter: `id=eq.${projectId}`,
                },
                (payload) => {
                    console.log('🔴 Project updated via realtime:', payload);

                    // Revalidar o cache do SWR para atualizar o UI
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
                } else if (status === 'TIMED_OUT') {
                    console.error('🔴 Realtime subscription timed out');
                } else {
                    console.log('🔴 Realtime subscription status:', status);
                }
            });

        // Cleanup ao desmontar
        return () => {
            console.log('🔴 Unsubscribing from project realtime');
            supabase.removeChannel(channel);
        };
    }, [projectId]);
}
