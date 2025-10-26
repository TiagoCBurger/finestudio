import { currentUser, currentUserProfile } from '@/lib/auth';
import { env } from '@/lib/env';
import { GatewayProvider } from '@/providers/gateway';
import { PostHogIdentifyProvider } from '@/providers/posthog-provider';
import {
  type SubscriptionContextType,
  SubscriptionProvider,
} from '@/providers/subscription';
import { RealtimeManagerProvider } from '@/providers/realtime-manager';
import { ReactFlowProvider } from '@xyflow/react';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

const AuthenticatedLayout = async ({ children }: AuthenticatedLayoutProps) => {
  const user = await currentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await currentUserProfile();

  if (!profile) {
    return null;
  }

  // Get access token for Realtime
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() { },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || null;

  // Subscription system removed - all users have free access
  const plan: SubscriptionContextType['plan'] = 'free';

  return (
    <SubscriptionProvider
      isSubscribed={true} // Everyone is "subscribed" (free access)
      plan={plan}
    >
      <GatewayProvider>
        <PostHogIdentifyProvider>
          <RealtimeManagerProvider accessToken={accessToken}>
            <ReactFlowProvider>{children}</ReactFlowProvider>
          </RealtimeManagerProvider>
        </PostHogIdentifyProvider>
      </GatewayProvider>
    </SubscriptionProvider>
  );
};

export default AuthenticatedLayout;
