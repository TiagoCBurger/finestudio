// Credits system removed
import { profile } from '@/schema';
import { eq } from 'drizzle-orm';
import { database } from './database';
import { env } from './env';
import { createClient } from './supabase/server';

export const currentUser = async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
};

export const currentUserProfile = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error('User not found');
  }

  const userProfiles = await database
    .select()
    .from(profile)
    .where(eq(profile.id, user.id));
  let userProfile = userProfiles.at(0);

  if (!userProfile && user.email) {
    const response = await database
      .insert(profile)
      .values({ id: user.id })
      .returning();

    if (!response.length) {
      throw new Error('Failed to create user profile');
    }

    userProfile = response[0];
  }

  return userProfile;
};

export const getSubscribedUser = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error('Create an account to use AI features.');
  }

  const profile = await currentUserProfile();

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Subscription check removed - free access for all users

  // Sistema de créditos removido - acesso livre para todos

  return user;
};
