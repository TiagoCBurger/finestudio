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

        // Subscrever às mudanças na tabela projects
        const channel = supabase
            .channel(`project:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'projects',
                    filter: `id=eq.${projectId}`,
                },
                (payload) => {
                    console.log('🔴 Project updated via realtime:', payload);

                    // Revalidar o cache do SWR para atualizar o UI
                    // Usar try-catch para evitar erros durante a revalidação
                    try {
                        mutate(`/api/projects/${projectId}`);
                    } catch (error) {
                        console.error('🔴 Error revalidating project:', error);
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔴 Realtime subscription status:', status);
            });

        // Cleanup ao desmontar
        return () => {
            console.log('🔴 Unsubscribing from project realtime');
            supabase.removeChannel(channel);
        };
    }, [projectId]);
}
