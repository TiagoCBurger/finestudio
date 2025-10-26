/**
 * Centralized Realtime Connection Manager
 * 
 * Ensures only ONE WebSocket connection is created and shared across all channels.
 * Prevents "WebSocket is closed before the connection is established" errors.
 */

import { createClient } from '@/lib/supabase/client';
import { realtimeLogger } from '@/lib/realtime-logger';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

interface ChannelConfig {
    topic: string;
    events: Array<{
        event: string;
        handler: (payload: any) => void;
    }>;
    isPrivate?: boolean;
}

class RealtimeManager {
    private supabase: SupabaseClient | null = null;
    private channels: Map<string, RealtimeChannel> = new Map();
    private isConnecting: boolean = false;
    private isConnected: boolean = false;
    private connectionPromise: Promise<void> | null = null;

    /**
     * Initialize the WebSocket connection (only once)
     */
    private async ensureConnection(): Promise<void> {
        // If already connected, return immediately
        if (this.isConnected && this.supabase) {
            return;
        }

        // If connection is in progress, wait for it
        if (this.isConnecting && this.connectionPromise) {
            return this.connectionPromise;
        }

        // Start new connection
        this.isConnecting = true;
        this.connectionPromise = this.connect();

        try {
            await this.connectionPromise;
        } finally {
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }

    private async connect(): Promise<void> {
        realtimeLogger.info('🔌 Initializing Realtime connection...');

        // Get or create Supabase client
        this.supabase = createClient();

        // Get session for authentication
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
            realtimeLogger.error('Failed to get session', { error: error.message });
            throw error;
        }

        if (!session) {
            realtimeLogger.error('No active session found');
            throw new Error('No active session');
        }

        // Set auth for Realtime
        this.supabase.realtime.setAuth(session.access_token);

        this.isConnected = true;
        realtimeLogger.success('✅ Realtime connection ready');
    }

    /**
     * Subscribe to a channel (creates channel if needed)
     */
    async subscribe(config: ChannelConfig): Promise<RealtimeChannel> {
        // Ensure WebSocket connection is ready
        await this.ensureConnection();

        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { topic, events, isPrivate = true } = config;

        // Check if channel already exists
        if (this.channels.has(topic)) {
            const existingChannel = this.channels.get(topic)!;
            realtimeLogger.info('Channel already exists, reusing', { topic });
            return existingChannel;
        }

        realtimeLogger.info('Creating new channel', { topic, isPrivate });

        // Create channel
        let channel = this.supabase.channel(topic, {
            config: {
                broadcast: {
                    self: false,
                    ack: true,
                },
                private: isPrivate,
            },
        });

        // Attach event handlers
        for (const { event, handler } of events) {
            channel = channel.on('broadcast' as any, { event }, handler);
        }

        // Subscribe to channel
        await new Promise<void>((resolve, reject) => {
            channel.subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    realtimeLogger.success('Channel subscribed', { topic });
                    resolve();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    realtimeLogger.error('Channel subscription failed', { topic, status, error: err });
                    reject(new Error(`Subscription failed: ${status}`));
                }
            });
        });

        // Store channel
        this.channels.set(topic, channel);

        return channel;
    }

    /**
     * Unsubscribe from a channel
     */
    async unsubscribe(topic: string): Promise<void> {
        const channel = this.channels.get(topic);

        if (!channel || !this.supabase) {
            return;
        }

        realtimeLogger.info('Unsubscribing from channel', { topic });

        try {
            await channel.unsubscribe();
            this.supabase.removeChannel(channel);
            this.channels.delete(topic);
            realtimeLogger.success('Channel unsubscribed', { topic });
        } catch (error) {
            realtimeLogger.error('Error unsubscribing', { topic, error });
        }
    }

    /**
     * Reset the connection (useful for reconnection)
     */
    reset(): void {
        realtimeLogger.info('Resetting Realtime manager');

        // Unsubscribe from all channels
        for (const [topic] of this.channels) {
            this.unsubscribe(topic);
        }

        this.channels.clear();
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionPromise = null;
        this.supabase = null;
    }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();
