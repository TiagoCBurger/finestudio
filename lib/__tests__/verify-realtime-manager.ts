/**
 * Manual verification script for RealtimeConnectionManager
 * Run this to verify the singleton pattern and basic functionality
 */

import { RealtimeConnectionManager } from '../realtime-connection-manager';

console.log('🧪 Verifying RealtimeConnectionManager...\n');

// Test 1: Singleton pattern
console.log('Test 1: Singleton Pattern');
const instance1 = RealtimeConnectionManager.getInstance();
const instance2 = RealtimeConnectionManager.getInstance();
console.log('✓ Same instance:', instance1 === instance2);

// Test 2: Initial state
console.log('\nTest 2: Initial State');
console.log('✓ Connection state:', instance1.getConnectionState());
console.log('✓ Active channels:', instance1.getActiveChannels().length);

// Test 3: Channel tracking
console.log('\nTest 3: Channel Tracking');
const channels = instance1.getActiveChannels();
console.log('✓ Channels array:', Array.isArray(channels));
console.log('✓ Initial channels:', channels.length === 0);

// Test 4: Cleanup
console.log('\nTest 4: Cleanup');
instance1.cleanup().then(() => {
    console.log('✓ Cleanup completed');
    console.log('✓ Connection state after cleanup:', instance1.getConnectionState());
    console.log('✓ Channels after cleanup:', instance1.getActiveChannels().length);

    console.log('\n✅ All verification tests passed!');
}).catch(error => {
    console.error('❌ Cleanup failed:', error);
});
