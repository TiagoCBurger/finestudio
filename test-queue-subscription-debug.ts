/**
 * Debug script para testar subscrição do queue monitor
 * 
 * Execute com: npx tsx test-queue-subscription-debug.ts
 */

import { createClient } from '@supabase/supabase-js';

async function testQueueSubscription() {
    console.log('🔍 Starting queue subscription debug test...\n');

    // Load environment variables
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ Missing environment variables');
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
        console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
        process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log('   URL:', SUPABASE_URL);
    console.log('   Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
            params: {
                log_level: 'info'
            }
        }
    });

    console.log('✅ Supabase client created\n');

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error('❌ Failed to get session:', sessionError.message);
        process.exit(1);
    }

    if (!session) {
        console.error('❌ No active session found');
        console.error('   Please sign in first using the web app');
        process.exit(1);
    }

    console.log('✅ Session found');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Token:', session.access_token.substring(0, 20) + '...\n');

    // Set auth for realtime
    supabase.realtime.setAuth(session.access_token);
    console.log('✅ Auth token set for Realtime\n');

    // Create channel
    const topic = `fal_jobs:${session.user.id}`;
    console.log('📡 Creating channel:', topic);

    const channel = supabase.channel(topic, {
        config: {
            broadcast: { self: false, ack: true },
            private: true
        }
    });

    console.log('✅ Channel created\n');

    // Subscribe to events
    console.log('📡 Subscribing to events...');

    let receivedCount = 0;

    channel
        .on('broadcast', { event: 'INSERT' }, (payload) => {
            receivedCount++;
            console.log('\n🎉 INSERT event received!');
            console.log('   Count:', receivedCount);
            console.log('   Payload:', JSON.stringify(payload, null, 2));
        })
        .on('broadcast', { event: 'UPDATE' }, (payload) => {
            receivedCount++;
            console.log('\n🔄 UPDATE event received!');
            console.log('   Count:', receivedCount);
            console.log('   Payload:', JSON.stringify(payload, null, 2));
        })
        .on('broadcast', { event: 'DELETE' }, (payload) => {
            receivedCount++;
            console.log('\n🗑️ DELETE event received!');
            console.log('   Count:', receivedCount);
            console.log('   Payload:', JSON.stringify(payload, null, 2));
        })
        .subscribe((status, err) => {
            console.log('\n📊 Subscription status:', status);
            if (err) {
                console.error('   Error:', err);
            }

            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to channel!');
                console.log('   Topic:', topic);
                console.log('   Waiting for events...');
                console.log('   (Create a new image generation to test)\n');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Channel error:', err?.message || 'Unknown error');
                process.exit(1);
            } else if (status === 'TIMED_OUT') {
                console.error('⏱️ Connection timed out');
                process.exit(1);
            } else if (status === 'CLOSED') {
                console.log('🔌 Connection closed');
                process.exit(0);
            }
        });

    // Keep process alive
    console.log('⏳ Waiting for events (press Ctrl+C to exit)...\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        console.log('   Total events received:', receivedCount);
        supabase.removeChannel(channel);
        process.exit(0);
    });
}

// Run test
testQueueSubscription().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
