/**
 * Example usage of the realtime-subscription utility
 * 
 * This file demonstrates how to use the shared subscription utility
 * in different scenarios.
 */

import { useEffect, useRef } from 'react';
import { createDebouncedSubscription, type SubscriptionState } from './realtime-subscription';

/**
 * Example 1: Simple subscription to a user-specific channel
 */
export function useUserNotifications(userId: string | undefined) {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!userId) {
            // Clean up if userId becomes undefined
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
            return;
        }

        // Create subscription with the utility
        const cleanup = createDebouncedSubscription({
            channelConfig: {
                topic: `user:${userId}:notifications`,
                broadcast: {
                    self: false,
                    ack: true
                },
                private: true
            },
            events: [
                {
                    event: 'notification_created',
                    handler: (payload) => {
                        console.log('New notification:', payload);
                        // Handle notification
                    }
                },
                {
                    event: 'notification_read',
                    handler: (payload) => {
                        console.log('Notification read:', payload);
                        // Handle read status
                    }
                }
            ],
            contextId: userId,
            onStatusChange: (status, error) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Connected to notifications');
                } else if (error) {
                    console.error('Subscription error:', error);
                }
            }
        });

        cleanupRef.current = cleanup;

        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
        };
    }, [userId]);
}

/**
 * Example 2: Subscription to a project channel with multiple events
 */
export function useProjectUpdates(projectId: string | undefined) {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!projectId) {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
            return;
        }

        const cleanup = createDebouncedSubscription({
            channelConfig: {
                topic: `project:${projectId}`,
                private: true
            },
            events: [
                {
                    event: 'project_updated',
                    handler: (payload) => {
                        console.log('Project updated:', payload);
                        // Revalidate cache or update state
                    }
                },
                {
                    event: 'member_joined',
                    handler: (payload) => {
                        console.log('Member joined:', payload);
                    }
                },
                {
                    event: 'member_left',
                    handler: (payload) => {
                        console.log('Member left:', payload);
                    }
                }
            ],
            contextId: projectId
        });

        cleanupRef.current = cleanup;

        return cleanup;
    }, [projectId]);
}

/**
 * Example 3: Subscription to a room channel with presence
 * (Note: This example shows broadcast events; presence would need additional setup)
 */
export function useRoomMessages(roomId: string | undefined) {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!roomId) {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
            return;
        }

        const cleanup = createDebouncedSubscription({
            channelConfig: {
                topic: `room:${roomId}:messages`,
                broadcast: {
                    self: true, // Receive own messages for optimistic updates
                    ack: true
                },
                private: true
            },
            events: [
                {
                    event: 'message_created',
                    handler: (payload) => {
                        console.log('New message:', payload);
                        // Add message to state
                    }
                },
                {
                    event: 'message_deleted',
                    handler: (payload) => {
                        console.log('Message deleted:', payload);
                        // Remove message from state
                    }
                },
                {
                    event: 'message_edited',
                    handler: (payload) => {
                        console.log('Message edited:', payload);
                        // Update message in state
                    }
                }
            ],
            contextId: roomId,
            onStatusChange: (status, error) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Connected to room');
                } else if (status === 'TIMED_OUT') {
                    console.warn('Connection timed out, will retry');
                } else if (error) {
                    console.error('Room subscription error:', error);
                }
            }
        });

        cleanupRef.current = cleanup;

        return cleanup;
    }, [roomId]);
}

/**
 * Example 4: Public channel subscription (not recommended for production)
 */
export function usePublicAnnouncements() {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const cleanup = createDebouncedSubscription({
            channelConfig: {
                topic: 'public:announcements',
                broadcast: {
                    self: false,
                    ack: false // Public channels don't need ack
                },
                private: false // Public channel
            },
            events: [
                {
                    event: 'announcement_posted',
                    handler: (payload) => {
                        console.log('New announcement:', payload);
                    }
                }
            ],
            contextId: 'public-announcements'
        });

        cleanupRef.current = cleanup;

        return cleanup;
    }, []);
}
