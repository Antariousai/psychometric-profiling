import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthCtx = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setInitializing(false);
      return undefined;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evt, next) => {
      setSession(next);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.refreshSession();
    return data.session ?? null;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      refreshSession,
    }),
    [session, initializing, refreshSession],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!isSupabaseConfigured) {
    return {
      session: null,
      user: null,
      initializing: false,
      refreshSession: async () => null,
    };
  }
  if (ctx == null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
