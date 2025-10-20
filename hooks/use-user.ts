import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to get the current authenticated user and listen for auth state changes
 * 
 * @returns Object containing user, loading state, and error
 * 
 * @example
 * ```tsx
 * const { user, loading, error } = useUser();
 * 
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!user) return <LoginPrompt />;
 * 
 * return <UserProfile user={user} />;
 * ```
 */
export const useUser = (): UseUserReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial user
    const fetchUser = async () => {
      try {
        const { data, error: fetchError } = await supabase.auth.getUser();

        if (fetchError) {
          throw fetchError;
        }

        setUser(data.user);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err : new Error('Failed to fetch user');
        console.error('Error fetching user:', errorMessage);
        setError(errorMessage);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setError(null);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
};

