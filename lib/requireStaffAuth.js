import { isSupabaseConfigured } from './supabase';

/**
 * Disabled by default: login stays a **demo flow** (no real SMS/session gate).
 * Set `EXPO_PUBLIC_REQUIRE_AUTH=true` when you enforce Supabase JWT + migration 003 RLS.
 */
export function mustRequireStaffLogin() {
  return (
    isSupabaseConfigured && process.env.EXPO_PUBLIC_REQUIRE_AUTH === 'true'
  );
}
