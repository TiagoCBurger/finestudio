/**
 * Example usage of useRealtimeSubscription hook
 * 
 * This file demonstrates various use cases for the useRealtimeSubscription hook
 */

import { useRealtimeSubscription } from './use-realtime-subscription';

/**
 * Example 1: Basic chat room subscription
 */
export function ChatRoomExample({ roomId }: { roomId: string }) {
    const { isConnected, error, broadcast } = useRealtimeSubscription({
        topic: `room:${roomId}:messages`,
        event: 'message_created',
        onMessage: (payload: { text: string; userId: string; timestamp: number }) => {
            console.log('New message:', payload);
            // Update UI with new message
        },
        enabled: true,
        private: true
    });

    const sendMessage = async (text: string) => {
        try {
            await broadcast('message_created', {
                text,
                userId: 'current-user-id',
                timestamp: Date.now()
            });
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    return (
        <div>
            <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            {error && <div>Error: {error.message}</div>}
            <button onClick={() => sendMessage('Hello!')}>Send Message</button>
        </div>
    );
}

/**
 * Example 2: Project updates subscription
 */
export function ProjectUpdatesExample({ projectId }: { projectId: string }) {
    const { isConnected, error, retry } = useRealtimeSubscription({
        topic: `project:${projectId}`,
        event: 'UPDATE',
        onMessage: (payload: { type: string; data: any }) => {
            console.log('Project updated:', payload);
            // Trigger SWR revalidation or update local state
        },
        enabled: true,
        private: true
    });

    return (
        <div>
            {!isConnected && <div>Connecting to project updates...</div>}
            {error && (
                <div>
                    <div>Error: {error.message}</div>
                    <button onClick={retry}>Retry Connection</button>
                </div>
            )}
        </div>
    );
}

/**
 * Example 3: Conditional subscription (enabled/disabled)
 */
export function ConditionalSubscriptionExample({
    userId,
    isAuthenticated
}: {
    userId: string;
    isAuthenticated: boolean;
}) {
    const { isConnected, connectionState } = useRealtimeSubscription({
        topic: `user:${userId}:notifications`,
        event: 'notification_received',
        onMessage: (payload: { title: string; message: string }) => {
            console.log('New notification:', payload);
            // Show notification to user
        },
        enabled: isAuthenticated, // Only subscribe when authenticated
        private: true
    });

    return (
        <div>
            <div>Connection State: {connectionState}</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        </div>
    );
}

/**
 * Example 4: Multiple event types on same channel
 */
export function MultiEventExample({ gameId }: { gameId: string }) {
    // Subscribe to player moves
    const moves = useRealtimeSubscription({
        topic: `game:${gameId}`,
        event: 'player_moved',
        onMessage: (payload: { playerId: string; position: { x: number; y: number } }) => {
            console.log('Player moved:', payload);
        },
        enabled: true,
        private: true
    });

    // Subscribe to game state changes
    const state = useRealtimeSubscription({
        topic: `game:${gameId}`,
        event: 'game_state_changed',
        onMessage: (payload: { state: string; winner?: string }) => {
            console.log('Game state changed:', payload);
        },
        enabled: true,
        private: true
    });

    const makeMove = async (x: number, y: number) => {
        try {
            await moves.broadcast('player_moved', {
                playerId: 'current-player-id',
                position: { x, y }
            });
        } catch (err) {
            console.error('Failed to broadcast move:', err);
        }
    };

    return (
        <div>
            <div>Moves Connected: {moves.isConnected ? 'Yes' : 'No'}</div>
            <div>State Connected: {state.isConnected ? 'Yes' : 'No'}</div>
            {(moves.error || state.error) && (
                <div>
                    Error: {moves.error?.message || state.error?.message}
                </div>
            )}
            <button onClick={() => makeMove(5, 10)}>Make Move</button>
        </div>
    );
}

/**
 * Example 5: Public channel (no authentication required)
 */
export function PublicAnnouncementsExample() {
    const { isConnected, error } = useRealtimeSubscription({
        topic: 'public:announcements',
        event: 'announcement_posted',
        onMessage: (payload: { title: string; content: string; timestamp: number }) => {
            console.log('New announcement:', payload);
            // Display announcement to all users
        },
        enabled: true,
        private: false, // Public channel
        self: false
    });

    return (
        <div>
            <div>Listening for announcements...</div>
            <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            {error && <div>Error: {error.message}</div>}
        </div>
    );
}

/**
 * Example 6: With self-broadcast (receive own messages)
 */
export function SelfBroadcastExample({ roomId }: { roomId: string }) {
    const { isConnected, broadcast } = useRealtimeSubscription({
        topic: `room:${roomId}:typing`,
        event: 'user_typing',
        onMessage: (payload: { userId: string; isTyping: boolean }) => {
            console.log('User typing status:', payload);
            // Update typing indicators
        },
        enabled: true,
        private: true,
        self: true // Receive own typing broadcasts
    });

    const setTyping = async (isTyping: boolean) => {
        try {
            await broadcast('user_typing', {
                userId: 'current-user-id',
                isTyping
            });
        } catch (err) {
            console.error('Failed to broadcast typing status:', err);
        }
    };

    return (
        <div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <input
                type="text"
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
                placeholder="Type a message..."
            />
        </div>
    );
}
