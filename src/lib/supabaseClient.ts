/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if user is authenticated with Supabase
 */
export async function getAuthUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Auth error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get auth user:', error);
    return null;
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Sign up error:', error);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to sign up:', error);
    return { error: 'An error occurred during sign up' };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to sign in:', error);
    return { error: 'An error occurred during sign in' };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Failed to sign out:', error);
    return { error: 'An error occurred during sign out' };
  }
}

/**
 * Watch authentication state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}
