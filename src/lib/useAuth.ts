import { useState, useEffect, useCallback } from 'react';
import { supabase, type Profile } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
}

// ─── Preview Mode: Bypass Auth ──────────────────────────────────────────────
const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';

const MOCK_USER = {
  id: 'preview-user-123',
  email: 'preview@huggy.app',
  user_metadata: { full_name: 'Preview User' }
} as User;

const MOCK_PROFILE = {
  id: 'preview-user-123',
  full_name: 'Preview User',
  email: 'preview@huggy.app',
  plan: 'pro',
  credits: 9999,
  max_credits: 9999,
  created_at: new Date().toISOString()
} as Profile;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: DISABLE_AUTH ? MOCK_USER : null,
    profile: DISABLE_AUTH ? MOCK_PROFILE : null,
    session: DISABLE_AUTH ? { user: MOCK_USER } as Session : null,
    loading: !DISABLE_AUTH,
  });

  // Fetch profile from DB
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile | null;
  }, []);

  // Initialize session + listen for changes
  useEffect(() => {
    // Skip auth in preview mode
    if (DISABLE_AUTH) {
      console.log('🔓 PREVIEW MODE: Auth disabled');
      return;
    }
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          setState({ user: session.user, profile, session, loading: false });
        } catch {
          setState({ user: session.user, profile: null, session, loading: false });
        }
      } else {
        setState({ user: null, profile: null, session: null, loading: false });
      }
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user.id);
            setState({ user: session.user, profile, session, loading: false });
          } catch {
            setState({ user: session.user, profile: null, session, loading: false });
          }
        } else {
          setState({ user: null, profile: null, session: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ─── Auth Methods ────────────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    if (DISABLE_AUTH) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (DISABLE_AUTH) return;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (DISABLE_AUTH) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) throw error;
  };

  const signInWithGitHub = async () => {
    if (DISABLE_AUTH) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (DISABLE_AUTH) {
      console.log('🔓 PREVIEW MODE: Sign out disabled');
      return;
    }
    await supabase.auth.signOut();
    setState({ user: null, profile: null, session: null, loading: false });
  };

  // Refresh profile data (e.g. after credits change)
  const refreshProfile = useCallback(async () => {
    if (DISABLE_AUTH) {
      setState(prev => ({ ...prev, profile: MOCK_PROFILE }));
      return;
    }
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    refreshProfile,
    isAuthenticated: !!state.user,
  };
}
