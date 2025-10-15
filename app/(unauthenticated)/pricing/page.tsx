import { currentUser, currentUserProfile } from '@/lib/auth';
import { env } from '@/lib/env';
import type { Metadata } from 'next';
import { Hero } from './components/hero';

export const metadata: Metadata = {
  title: 'Fine Studio | Pricing',
  description: 'Choose a plan to get access to all features.',
};

const PricingPage = async () => {
  const user = await currentUser();
  let currentPlan: 'free' | 'hobby' | 'pro' | undefined;

  if (user) {
    const profile = await currentUserProfile();

    // Pricing system removed - all users have free access
    if (profile) {
      currentPlan = 'free';
    }
  }

  return <Hero currentPlan={currentPlan} authenticated={Boolean(user)} />;
};

export default PricingPage;
