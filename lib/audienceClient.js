import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabase';

const cache = {};

/** Separate auth storage so these logins do not replace the field-officer session. */
export function audienceClient(storageKey) {
  if (!isSupabaseConfigured) return null;
  if (!cache[storageKey]) {
    cache[storageKey] = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return cache[storageKey];
}

export function branchManagerClient() {
  return audienceClient('pmp-branch-manager');
}

export function antariousClient() {
  return audienceClient('pmp-antarious-lab');
}
