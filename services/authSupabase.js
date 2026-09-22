import { supabase } from '../lib/supabase';

/**
 * Normalize common Bangladesh GSM inputs to +880XXXXXXXXXX
 * @param {string} raw
 */
export function bdPhoneToE164(raw) {
  const d = raw.replace(/\D/g, '');
  if (!d.length) throw new Error('Enter a mobile number');
  if (d.startsWith('880') && d.length >= 12) return `+${d}`;
  if (d.length === 11 && d.startsWith('01')) return `+880${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('1')) return `+880${d}`;
  throw new Error('Use an 01XX… Bangladesh mobile number');
}

/** @returns {Promise<{ error: Error | null }>} */
export async function sendStaffPhoneOtp(rawPhone) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  try {
    const phone = bdPhoneToE164(rawPhone);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    return { error };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** @returns {Promise<{ error: Error | null, session?: object | null }>} */
export async function verifyStaffPhoneOtp(phoneE164, token) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: token.replace(/\D/g, ''),
    type: 'sms',
  });
  return { error, session: data.session };
}

/** Staging/dev only — create users via Supabase dashboard and store password securely. */
export async function signInStaffPassword(email, password) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signOutStaff() {
  await supabase?.auth.signOut();
}
