import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** expo-router web SSR runs in Node where `window` is missing — AsyncStorage touches `window`. */
function createWebAuthStorage() {
  const memory = {};
  return {
    getItem: async (key) => {
      if (typeof window === 'undefined') return memory[key] ?? null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      if (typeof window === 'undefined') {
        memory[key] = String(value);
        return;
      }
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memory[key] = String(value);
      }
    },
    removeItem: async (key) => {
      delete memory[key];
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* noop */
      }
    },
  };
}

const authStorage = Platform.OS === 'web' ? createWebAuthStorage() : AsyncStorage;

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
