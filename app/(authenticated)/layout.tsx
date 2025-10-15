import { currentUser, currentUserProfile } from '@/lib/auth';
import { env } from '@/lib/env';
import { GatewayProvider } from '@/providers/gateway';
import { PostHogIdentifyProvider } from '@/providers/posthog-provider';
import {
  type SubscriptionContextType,
  SubscriptionProvider,
} from '@/providers/subscription';
import { ReactFlowProvider } from '@xyflow/react';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

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

  // Subscription system removed - all users have free access
  const plan: SubscriptionContextType['plan'] = 'free';

  return (
    <SubscriptionProvider
      isSubscribed={true} // Everyone is "subscribed" (free access)
      plan={plan}
    >
      <GatewayProvider>
        <PostHogIdentifyProvider>
          <ReactFlowProvider>{children}</ReactFlowProvider>
        </PostHogIdentifyProvider>
      </GatewayProvider>
    </SubscriptionProvider>
  );
};

export default AuthenticatedLayout;
