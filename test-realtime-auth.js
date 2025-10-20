/**
 * Test script to verify Realtime authentication
 * Run with: node test-realtime-auth.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔍 Testing Realtime Authentication\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      log_level: 'info'
    }
  }
});

async function testAuth() {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('⚠️  No active session found');
      console.log('   This is expected if running from Node.js');
      console.log('   The browser client should have a session from the user login\n');
    } else {
      console.log('✅ Active session found');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
      console.log('   Token expires:', new Date(session.expires_at * 1000).toISOString(), '\n');
    }
    
    // Try to set auth for realtime
    console.log('🔄 Calling supabase.realtime.setAuth()...');
    await supabase.realtime.setAuth();
    console.log('✅ setAuth() completed successfully\n');
    
    // Try to subscribe to a test channel
    const testProjectId = 'cd882720-e06d-4a9e-8a13-a7d268871652';
    console.log(`🔄 Attempting to subscribe to project:${testProjectId}...`);
    
    const channel = supabase
      .channel(`project:${testProjectId}`, {
        config: {
          broadcast: { self: false, ack: true },
          private: true
        }
      })
      .on('broadcast', { event: 'project_updated' }, (payload) => {
        console.log('📨 Received broadcast:', payload);
      });
    
    channel.subscribe((status, err) => {
      console.log(`\n📡 Subscription status: ${status}`);
      if (err) {
        console.error('❌ Subscription error:', err);
      }
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to private channel!');
        console.log('   This means RLS policies are working correctly\n');
        
        // Clean up and exit
        setTimeout(() => {
          supabase.removeChannel(channel);
          console.log('✅ Test completed successfully');
          process.exit(0);
        }, 2000);
      } else if (status === 'CHANNEL_ERROR') {
        console.log('❌ Failed to subscribe - likely an RLS policy issue');
        console.log('   Check that:');
        console.log('   1. You have an active session (logged in)');
        console.log('   2. RLS policies on realtime.messages allow access');
        console.log('   3. You own or are a member of the project\n');
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAuth();
