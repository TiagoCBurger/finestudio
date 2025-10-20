#!/usr/bin/env node

/**
 * Enhanced Multi-Window Sync Test
 * 
 * This script simulates two windows open on the same project
 * and verifies that changes are synchronized via Realtime with:
 * - Step-by-step verification
 * - Timing measurements
 * - Bidirectional testing (A→B and B→A)
 * - Authentication support for private channels
 * - Detailed diagnostics
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

// Configuration
const USE_PRIVATE_CHANNELS = process.env.USE_PRIVATE_CHANNELS === 'true';
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'cd882720-e06d-4a9e-8a13-a7d268871652';

console.log('🧪 Enhanced Multi-Window Sync Test\n');
console.log('Configuration:');
console.log(`  • Project ID: ${TEST_PROJECT_ID}`);
console.log(`  • Private Channels: ${USE_PRIVATE_CHANNELS ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Authentication: ${testEmail ? '✅ Configured' : '❌ Not configured'}`);
console.log();

// Timing utilities
class Timer {
  constructor(name) {
    this.name = name;
    this.start = Date.now();
  }
  
  elapsed() {
    return Date.now() - this.start;
  }
  
  log(message) {
    console.log(`⏱️  [${this.elapsed()}ms] ${message}`);
  }
}

// Test results tracker
class TestResults {
  constructor() {
    this.steps = [];
    this.timings = {};
    this.errors = [];
  }
  
  addStep(name, status, details = {}) {
    this.steps.push({ name, status, details, timestamp: Date.now() });
  }
  
  addTiming(name, duration) {
    this.timings[name] = duration;
  }
  
  addError(error) {
    this.errors.push({ message: error.message, stack: error.stack, timestamp: Date.now() });
  }
  
  getSummary() {
    const passed = this.steps.filter(s => s.status === 'pass').length;
    const failed = this.steps.filter(s => s.status === 'fail').length;
    const warnings = this.steps.filter(s => s.status === 'warning').length;
    
    return {
      total: this.steps.length,
      passed,
      failed,
      warnings,
      success: failed === 0,
      timings: this.timings,
      errors: this.errors
    };
  }
}

// Authentication helper
async function authenticateClient(client, email, password) {
  const timer = new Timer('Authentication');
  
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    timer.log(`✅ Authenticated as ${email}`);
    return { success: true, session: data.session, elapsed: timer.elapsed() };
  } catch (error) {
    timer.log(`❌ Authentication failed: ${error.message}`);
    return { success: false, error, elapsed: timer.elapsed() };
  }
}

async function testMultiWindowSync() {
  const results = new TestResults();
  const overallTimer = new Timer('Overall Test');
  
  console.log('📡 Simulating two windows open on the same project...\n');
  
  // Create two Supabase clients (simulating two windows)
  const window1 = createClient(supabaseUrl, supabaseKey);
  const window2 = createClient(supabaseUrl, supabaseKey);
  
  // Update counters with timing
  let window1Updates = 0;
  let window2Updates = 0;
  let window1ReceiveTimes = [];
  let window2ReceiveTimes = [];
  
  // Step 1: Authentication (if using private channels)
  if (USE_PRIVATE_CHANNELS && testEmail && testPassword) {
    console.log('🔐 Step 1: Authenticating clients...\n');
    const authTimer = new Timer('Authentication');
    
    const auth1 = await authenticateClient(window1, testEmail, testPassword);
    const auth2 = await authenticateClient(window2, testEmail, testPassword);
    
    if (!auth1.success || !auth2.success) {
      results.addStep('Authentication', 'fail', { 
        window1: auth1.success, 
        window2: auth2.success 
      });
      console.error('❌ Authentication failed. Cannot proceed with private channels.');
      return results;
    }
    
    results.addStep('Authentication', 'pass', { 
      elapsed: authTimer.elapsed(),
      window1Session: !!auth1.session,
      window2Session: !!auth2.session
    });
    results.addTiming('authentication', authTimer.elapsed());
    console.log(`✅ Both clients authenticated (${authTimer.elapsed()}ms)\n`);
  } else if (USE_PRIVATE_CHANNELS) {
    console.log('⚠️  Private channels enabled but no credentials provided');
    console.log('   Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env\n');
    results.addStep('Authentication', 'warning', { 
      message: 'Private channels enabled but no credentials' 
    });
  }
  
  // Step 2: Configure listeners on both windows
  console.log('📻 Step 2: Configuring listeners on both windows...\n');
  const setupTimer = new Timer('Channel Setup');
  
  const channel1 = window1
    .channel(`project:${TEST_PROJECT_ID}`, {
      config: {
        broadcast: { self: false, ack: true },
        private: USE_PRIVATE_CHANNELS,
      },
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      const receiveTime = Date.now();
      window1Updates++;
      window1ReceiveTimes.push(receiveTime);
      console.log('📨 [Window 1] Update received:', {
        updateNumber: window1Updates,
        type: payload.payload?.type,
        timestamp: new Date(receiveTime).toISOString(),
      });
    });
  
  const channel2 = window2
    .channel(`project:${TEST_PROJECT_ID}`, {
      config: {
        broadcast: { self: false, ack: true },
        private: USE_PRIVATE_CHANNELS,
      },
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      const receiveTime = Date.now();
      window2Updates++;
      window2ReceiveTimes.push(receiveTime);
      console.log('📨 [Window 2] Update received:', {
        updateNumber: window2Updates,
        type: payload.payload?.type,
        timestamp: new Date(receiveTime).toISOString(),
      });
    });
  
  results.addTiming('channel_setup', setupTimer.elapsed());
  
  // Step 3: Subscribe both channels
  console.log('🔌 Step 3: Subscribing both windows...\n');
  const subscribeTimer = new Timer('Subscription');
  
  try {
    // Set auth for private channels
    if (USE_PRIVATE_CHANNELS) {
      await window1.realtime.setAuth(window1.auth.session()?.access_token);
      await window2.realtime.setAuth(window2.auth.session()?.access_token);
      console.log('🔑 Auth tokens set for private channels');
    }
    
    await Promise.all([
      new Promise((resolve, reject) => {
        channel1.subscribe((status, err) => {
          console.log(`🔌 [Window 1] Status: ${status}`);
          if (err) console.error(`   Error: ${err.message}`);
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`${status}: ${err?.message || 'Unknown error'}`));
          }
        });
      }),
      new Promise((resolve, reject) => {
        channel2.subscribe((status, err) => {
          console.log(`🔌 [Window 2] Status: ${status}`);
          if (err) console.error(`   Error: ${err.message}`);
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`${status}: ${err?.message || 'Unknown error'}`));
          }
        });
      })
    ]);
    
    const subscribeElapsed = subscribeTimer.elapsed();
    results.addStep('Subscription', 'pass', { elapsed: subscribeElapsed });
    results.addTiming('subscription', subscribeElapsed);
    console.log(`✅ Both windows connected! (${subscribeElapsed}ms)\n`);
  } catch (error) {
    results.addStep('Subscription', 'fail', { error: error.message });
    results.addError(error);
    console.error(`❌ Subscription failed: ${error.message}\n`);
    return results;
  }
  
  // Step 4: Fetch current project
  console.log('📦 Step 4: Fetching current project...\n');
  const fetchTimer = new Timer('Project Fetch');
  
  const { data: project, error: projectError } = await window1
    .from('project')
    .select('id, name, content')
    .eq('id', TEST_PROJECT_ID)
    .single();
    
  if (projectError) {
    results.addStep('Project Fetch', 'fail', { error: projectError.message });
    results.addError(projectError);
    console.error(`❌ Error fetching project: ${projectError.message}\n`);
    return results;
  }
  
  const fetchElapsed = fetchTimer.elapsed();
  results.addStep('Project Fetch', 'pass', { 
    projectName: project.name,
    elapsed: fetchElapsed 
  });
  results.addTiming('project_fetch', fetchElapsed);
  console.log(`✅ Project found: ${project.name} (${fetchElapsed}ms)\n`);
  
  const currentContent = project.content || { nodes: [], edges: [], viewport: {} };
  
  // Step 5: Test A→B (Window 1 to Window 2)
  console.log('🔄 Step 5: Testing sync from Window 1 → Window 2...\n');
  
  const testNode1Id = `test-node-${Date.now()}`;
  const updatedContent = {
    ...currentContent,
    nodes: [
      ...(currentContent.nodes || []),
      {
        id: testNode1Id,
        type: 'text',
        position: { x: 100, y: 100 },
        data: { text: 'Multi-window sync test - Window 1' }
      }
    ]
  };
  
  const updateStartTime = Date.now();
  const { error: updateError } = await window1
    .from('project')
    .update({ 
      content: updatedContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_PROJECT_ID);
  
  if (updateError) {
    results.addStep('Window 1 Update', 'fail', { error: updateError.message });
    results.addError(updateError);
    console.error(`❌ Error updating project: ${updateError.message}\n`);
    return results;
  }
  
  console.log(`✅ Project updated by Window 1 (node: ${testNode1Id})`);
  console.log('⏳ Waiting for broadcast to reach Window 2...\n');
  
  // Wait for broadcast with timeout
  const window2UpdatesBefore = window2Updates;
  const broadcastTimeout = 5000; // 5 seconds
  const checkInterval = 100; // Check every 100ms
  let waited = 0;
  
  while (window2Updates === window2UpdatesBefore && waited < broadcastTimeout) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  
  const latency = window2ReceiveTimes.length > 0 
    ? window2ReceiveTimes[window2ReceiveTimes.length - 1] - updateStartTime 
    : null;
  
  console.log(`📊 Window 1 received: ${window1Updates} update(s)`);
  console.log(`📊 Window 2 received: ${window2Updates} update(s)`);
  
  if (window2Updates > window2UpdatesBefore) {
    console.log(`✅ SUCCESS! Window 2 received the update from Window 1`);
    console.log(`   Latency: ${latency}ms`);
    results.addStep('Sync A→B', 'pass', { 
      latency,
      waited,
      window2Updates: window2Updates - window2UpdatesBefore
    });
    results.addTiming('sync_a_to_b_latency', latency);
  } else {
    console.log(`❌ FAILURE! Window 2 did NOT receive the update from Window 1`);
    console.log(`   Waited: ${waited}ms`);
    console.log('   Possible issues:');
    console.log('   • Database trigger not working');
    console.log('   • RLS policies blocking broadcast');
    console.log('   • Incorrect channel configuration');
    results.addStep('Sync A→B', 'fail', { 
      waited,
      timeout: broadcastTimeout 
    });
  }
  
  // Step 6: Test B→A (Window 2 to Window 1)
  console.log('\n🔄 Step 6: Testing sync from Window 2 → Window 1...\n');
  
  const testNode2Id = `test-node-2-${Date.now()}`;
  const updatedContent2 = {
    ...updatedContent,
    nodes: [
      ...updatedContent.nodes,
      {
        id: testNode2Id,
        type: 'text',
        position: { x: 200, y: 200 },
        data: { text: 'Reverse test - Window 2 to Window 1' }
      }
    ]
  };
  
  const window1UpdatesBefore = window1Updates;
  const updateStartTime2 = Date.now();
  
  await window2
    .from('project')
    .update({ 
      content: updatedContent2,
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_PROJECT_ID);
  
  console.log(`✅ Project updated by Window 2 (node: ${testNode2Id})`);
  console.log('⏳ Waiting for broadcast to reach Window 1...\n');
  
  // Wait for broadcast with timeout
  waited = 0;
  while (window1Updates === window1UpdatesBefore && waited < broadcastTimeout) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  
  const latency2 = window1ReceiveTimes.length > 0 
    ? window1ReceiveTimes[window1ReceiveTimes.length - 1] - updateStartTime2 
    : null;
  
  console.log(`📊 Window 1 received: ${window1Updates - window1UpdatesBefore} new update(s)`);
  console.log(`📊 Window 2 received: ${window2Updates - window2UpdatesBefore} new update(s)`);
  
  if (window1Updates > window1UpdatesBefore) {
    console.log(`✅ SUCCESS! Window 1 received the update from Window 2`);
    console.log(`   Latency: ${latency2}ms`);
    console.log('   Bidirectional sync working!');
    results.addStep('Sync B→A', 'pass', { 
      latency: latency2,
      waited,
      window1Updates: window1Updates - window1UpdatesBefore
    });
    results.addTiming('sync_b_to_a_latency', latency2);
  } else {
    console.log(`❌ FAILURE! Window 1 did NOT receive the update from Window 2`);
    console.log(`   Waited: ${waited}ms`);
    results.addStep('Sync B→A', 'fail', { 
      waited,
      timeout: broadcastTimeout 
    });
  }
  
  // Step 7: Cleanup
  console.log('\n🧹 Step 7: Cleaning up...\n');
  const cleanupTimer = new Timer('Cleanup');
  
  window1.removeChannel(channel1);
  window2.removeChannel(channel2);
  console.log('✅ Channels removed');
  
  // Remove test nodes
  await window1
    .from('project')
    .update({ 
      content: currentContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_PROJECT_ID);
  
  const cleanupElapsed = cleanupTimer.elapsed();
  results.addStep('Cleanup', 'pass', { elapsed: cleanupElapsed });
  results.addTiming('cleanup', cleanupElapsed);
  console.log(`✅ Test nodes removed (${cleanupElapsed}ms)`);
  
  // Add overall timing
  results.addTiming('total', overallTimer.elapsed());
  
  return results;
}

async function main() {
  try {
    const results = await testMultiWindowSync();
    const summary = results.getSummary();
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 Multi-Window Sync Test Summary');
    console.log('='.repeat(70));
    
    console.log('\n📊 Test Steps:');
    console.log(`  • Total: ${summary.total}`);
    console.log(`  • Passed: ${summary.passed} ✅`);
    console.log(`  • Failed: ${summary.failed} ❌`);
    console.log(`  • Warnings: ${summary.warnings} ⚠️`);
    
    console.log('\n⏱️  Timing Breakdown:');
    Object.entries(summary.timings).forEach(([name, duration]) => {
      const label = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`  • ${label}: ${duration}ms`);
    });
    
    if (summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      summary.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
      });
    }
    
    console.log('\n📝 Detailed Steps:');
    results.steps.forEach((step, i) => {
      const icon = step.status === 'pass' ? '✅' : step.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${i + 1}. ${icon} ${step.name}`);
      if (Object.keys(step.details).length > 0) {
        Object.entries(step.details).forEach(([key, value]) => {
          console.log(`     - ${key}: ${JSON.stringify(value)}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log(`Overall Status: ${summary.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));
    
    if (summary.success) {
      console.log('\n🎉 Multi-window sync is working correctly!');
      console.log('   Changes in one window are automatically reflected in the other.');
      
      const avgLatency = summary.timings.sync_a_to_b_latency && summary.timings.sync_b_to_a_latency
        ? (summary.timings.sync_a_to_b_latency + summary.timings.sync_b_to_a_latency) / 2
        : null;
      
      if (avgLatency) {
        console.log(`   Average sync latency: ${avgLatency.toFixed(0)}ms`);
        
        if (avgLatency < 500) {
          console.log('   ⚡ Excellent performance!');
        } else if (avgLatency < 1000) {
          console.log('   ✅ Good performance');
        } else {
          console.log('   ⚠️  Performance could be improved');
        }
      }
    } else {
      console.log('\n⚠️  Multi-window sync needs attention.');
      console.log('   Review the logs above to identify the issue.');
      console.log('\n💡 Troubleshooting tips:');
      console.log('   • Check if database trigger is enabled');
      console.log('   • Verify RLS policies on realtime.messages table');
      console.log('   • Ensure authentication is working (for private channels)');
      console.log('   • Check Supabase Realtime logs in dashboard');
    }
    
    process.exit(summary.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();