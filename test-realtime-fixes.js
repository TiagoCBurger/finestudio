/**
 * Comprehensive test suite for realtime timeout fixes
 * Tests multiple subscriptions, reconnection, and network conditions
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Test 5.1: Multiple subscriptions (simulating multiple tabs)
async function testMultipleSubscriptions() {
  log('\n=== Test 5.1: Multiple Subscriptions (Simulating Multiple Tabs) ===', 'cyan')
  
  const clients = []
  const channels = []
  const errors = []
  const messages = []
  
  try {
    // Create 5 clients (simulating 5 browser tabs)
    for (let i = 0; i < 5; i++) {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            log_level: 'info'
          }
        }
      })
      clients.push(client)
      
      const channelName = `test-multi-${Date.now()}-${i}`
      const channel = client.channel(channelName, {
        config: {
          broadcast: { self: true, ack: true }
        }
      })
      
      channel.on('broadcast', { event: 'test_message' }, (payload) => {
        messages.push({ client: i, payload })
        log(`  Client ${i} received message: ${JSON.stringify(payload.payload)}`, 'green')
      })
      
      channels.push({ client: i, channel, name: channelName })
    }
    
    // Subscribe all channels
    log('Subscribing all 5 clients...', 'blue')
    const subscribePromises = channels.map(({ client, channel, name }) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          errors.push({ client, error: 'TIMED_OUT', channel: name })
          reject(new Error(`Client ${client} timed out`))
        }, 30000)
        
        channel.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout)
            log(`  ✓ Client ${client} subscribed successfully`, 'green')
            resolve()
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout)
            errors.push({ client, error: err, channel: name })
            reject(err)
          }
        })
      })
    })
    
    await Promise.all(subscribePromises)
    
    // Wait a bit for connections to stabilize
    await sleep(2000)
    
    // Send test messages from each client
    log('\nSending test messages from each client...', 'blue')
    for (let i = 0; i < channels.length; i++) {
      const { channel } = channels[i]
      await channel.send({
        type: 'broadcast',
        event: 'test_message',
        payload: { from: i, timestamp: Date.now() }
      })
      await sleep(500)
    }
    
    // Wait for messages to be received
    await sleep(2000)
    
    // Verify results
    log('\n--- Results ---', 'yellow')
    log(`Total clients: 5`, 'blue')
    log(`Successfully subscribed: ${5 - errors.length}`, errors.length === 0 ? 'green' : 'yellow')
    log(`Errors: ${errors.length}`, errors.length === 0 ? 'green' : 'red')
    log(`Messages received: ${messages.length}`, messages.length > 0 ? 'green' : 'red')
    
    if (errors.length > 0) {
      log('\nErrors encountered:', 'red')
      errors.forEach(err => {
        log(`  Client ${err.client}: ${err.error}`, 'red')
      })
    }
    
    // Cleanup
    for (const { channel } of channels) {
      await channel.unsubscribe()
    }
    
    return {
      success: errors.length === 0 && messages.length > 0,
      errors: errors.length,
      messages: messages.length
    }
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red')
    return { success: false, error: error.message }
  }
}

// Test 5.2: Reconnection after timeout
async function testReconnection() {
  log('\n=== Test 5.2: Reconnection After Network Interruption ===', 'cyan')
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        log_level: 'info'
      }
    }
  })
  
  const channelName = `test-reconnect-${Date.now()}`
  const channel = client.channel(channelName, {
    config: {
      broadcast: { self: true, ack: true }
    }
  })
  
  let subscribed = false
  let reconnected = false
  let messagesReceived = 0
  
  channel.on('broadcast', { event: 'test_message' }, (payload) => {
    messagesReceived++
    log(`  Received message: ${JSON.stringify(payload.payload)}`, 'green')
  })
  
  try {
    // Initial subscription
    log('Initial subscription...', 'blue')
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Initial subscription timed out')), 30000)
      
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          subscribed = true
          log('  ✓ Initial subscription successful', 'green')
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
    
    // Send initial message
    log('\nSending initial message...', 'blue')
    await channel.send({
      type: 'broadcast',
      event: 'test_message',
      payload: { phase: 'before_disconnect', timestamp: Date.now() }
    })
    await sleep(1000)
    
    // Simulate network interruption by unsubscribing
    log('\nSimulating network interruption...', 'yellow')
    await channel.unsubscribe()
    await sleep(2000)
    
    // Create new channel for reconnection (simulating fresh connection)
    log('Attempting reconnection...', 'blue')
    const reconnectChannel = client.channel(channelName, {
      config: {
        broadcast: { self: true, ack: true }
      }
    })
    
    reconnectChannel.on('broadcast', { event: 'test_message' }, (payload) => {
      messagesReceived++
      log(`  Received message: ${JSON.stringify(payload.payload)}`, 'green')
    })
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Reconnection timed out')), 30000)
      
      reconnectChannel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          reconnected = true
          log('  ✓ Reconnection successful', 'green')
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
    
    // Send message after reconnection
    log('\nSending message after reconnection...', 'blue')
    await reconnectChannel.send({
      type: 'broadcast',
      event: 'test_message',
      payload: { phase: 'after_reconnect', timestamp: Date.now() }
    })
    await sleep(1000)
    
    // Verify results
    log('\n--- Results ---', 'yellow')
    log(`Initial subscription: ${subscribed ? '✓' : '✗'}`, subscribed ? 'green' : 'red')
    log(`Reconnection: ${reconnected ? '✓' : '✗'}`, reconnected ? 'green' : 'red')
    log(`Messages received: ${messagesReceived}`, messagesReceived >= 2 ? 'green' : 'yellow')
    
    // Cleanup
    await reconnectChannel.unsubscribe()
    
    return {
      success: subscribed && reconnected && messagesReceived >= 2,
      subscribed,
      reconnected,
      messagesReceived
    }
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red')
    try {
      await channel.unsubscribe()
    } catch (e) {
      // Ignore cleanup errors
    }
    return { success: false, error: error.message }
  }
}

// Test 5.3: Behavior with slow network (simulated with delays)

// Test 5.3: Behavior with slow network (simulated with delays)
async function testSlowNetwork() {
  log('\n=== Test 5.3: Slow Network Behavior ===', 'cyan')
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        log_level: 'info',
        heartbeatIntervalMs: 30000
      },
      timeout: 30000
    }
  })
  
  const channelName = `test-slow-${Date.now()}`
  const channel = client.channel(channelName, {
    config: {
      broadcast: { self: true, ack: true }
    }
  })
  
  let subscribed = false
  let messagesReceived = 0
  const startTime = Date.now()
  let subscriptionTime = 0
  
  channel.on('broadcast', { event: 'test_message' }, (payload) => {
    messagesReceived++
    const latency = Date.now() - payload.payload.timestamp
    log(`  Received message with ${latency}ms latency`, latency < 5000 ? 'green' : 'yellow')
  })
  
  try {
    log('Subscribing with extended timeout...', 'blue')
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timed out after 30s'))
      }, 30000)
      
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          subscribed = true
          subscriptionTime = Date.now() - startTime
          log(`  ✓ Subscription successful in ${subscriptionTime}ms`, 'green')
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout)
          reject(err)
        } else if (status === 'TIMED_OUT') {
          clearTimeout(timeout)
          reject(new Error('Channel timed out'))
        }
      })
    })
    
    // Send messages with delays to simulate slow network
    log('\nSending messages with simulated network delays...', 'blue')
    for (let i = 0; i < 3; i++) {
      await sleep(1000) // Simulate slow send
      await channel.send({
        type: 'broadcast',
        event: 'test_message',
        payload: { index: i, timestamp: Date.now() }
      })
      log(`  Sent message ${i + 1}/3`, 'blue')
    }
    
    // Wait for messages
    await sleep(3000)
    
    // Verify results
    log('\n--- Results ---', 'yellow')
    log(`Subscription successful: ${subscribed ? '✓' : '✗'}`, subscribed ? 'green' : 'red')
    log(`Subscription time: ${subscriptionTime}ms`, subscriptionTime < 10000 ? 'green' : 'yellow')
    log(`Messages sent: 3`, 'blue')
    log(`Messages received: ${messagesReceived}`, messagesReceived === 3 ? 'green' : 'yellow')
    log(`Timeout handling: ${subscriptionTime < 30000 ? '✓' : '✗'}`, subscriptionTime < 30000 ? 'green' : 'red')
    
    // Cleanup
    await channel.unsubscribe()
    
    return {
      success: subscribed && subscriptionTime < 30000 && messagesReceived > 0,
      subscribed,
      subscriptionTime,
      messagesReceived
    }
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red')
    await channel.unsubscribe()
    return { success: false, error: error.message }
  }
}

// Run all tests
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan')
  log('║  Realtime Timeout Fixes - Comprehensive Test Suite   ║', 'cyan')
  log('╚════════════════════════════════════════════════════════╝', 'cyan')
  
  const results = {
    multipleSubscriptions: null,
    reconnection: null,
    slowNetwork: null
  }
  
  try {
    // Test 5.1
    results.multipleSubscriptions = await testMultipleSubscriptions()
    await sleep(2000)
    
    // Test 5.2
    results.reconnection = await testReconnection()
    await sleep(2000)
    
    // Test 5.3
    results.slowNetwork = await testSlowNetwork()
    
    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan')
    log('║                    Test Summary                        ║', 'cyan')
    log('╚════════════════════════════════════════════════════════╝', 'cyan')
    
    const allPassed = 
      results.multipleSubscriptions?.success &&
      results.reconnection?.success &&
      results.slowNetwork?.success
    
    log(`\n5.1 Multiple Subscriptions: ${results.multipleSubscriptions?.success ? '✓ PASS' : '✗ FAIL'}`, 
      results.multipleSubscriptions?.success ? 'green' : 'red')
    if (results.multipleSubscriptions) {
      log(`    - Errors: ${results.multipleSubscriptions.errors}`, 'blue')
      log(`    - Messages: ${results.multipleSubscriptions.messages}`, 'blue')
    }
    
    log(`\n5.2 Reconnection: ${results.reconnection?.success ? '✓ PASS' : '✗ FAIL'}`, 
      results.reconnection?.success ? 'green' : 'red')
    if (results.reconnection) {
      log(`    - Subscribed: ${results.reconnection.subscribed ? '✓' : '✗'}`, 'blue')
      log(`    - Reconnected: ${results.reconnection.reconnected ? '✓' : '✗'}`, 'blue')
      log(`    - Messages: ${results.reconnection.messagesReceived}`, 'blue')
    }
    
    log(`\n5.3 Slow Network: ${results.slowNetwork?.success ? '✓ PASS' : '✗ FAIL'}`, 
      results.slowNetwork?.success ? 'green' : 'red')
    if (results.slowNetwork) {
      log(`    - Subscription time: ${results.slowNetwork.subscriptionTime}ms`, 'blue')
      log(`    - Messages: ${results.slowNetwork.messagesReceived}`, 'blue')
    }
    
    log(`\n${'='.repeat(60)}`, 'cyan')
    log(`Overall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`, 
      allPassed ? 'green' : 'red')
    log(`${'='.repeat(60)}`, 'cyan')
    
    process.exit(allPassed ? 0 : 1)
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

// Run tests
runAllTests()
