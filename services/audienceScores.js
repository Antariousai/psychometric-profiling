import { normalizeStaffRole } from '../lib/prottoyFlags';

export async function signInAudience(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOutAudience(client) {
  await client.auth.signOut();
}

export async function fetchAudienceRole(client) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth?.user) return null;
  const { data, error } = await client
    .from('staff_profiles')
    .select('id, full_name, role')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, role: normalizeStaffRole(data.role), email: auth.user.email || '' };
}

const OVERALL_SELECT = `
  id,
  applicant_id,
  prottoy_category,
  prottoy_status,
  created_at,
  completed_at,
  applicants ( slug, profile ),
  prottoy_scores (
    ps, wi1000, sri1000, vi, vi_band, band, flags, reason_codes, recommendation, engine_version, computed_at
  )
`;

export async function fetchOverallScores(client, limit = 40) {
  const { data, error } = await client
    .from('assessment_sessions')
    .select(OVERALL_SELECT)
    .not('prottoy_category', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchScoreDetail(client, sessionId) {
  const { data, error } = await client
    .from('prottoy_score_detail')
    .select('session_id, signals, constructs, inputs_digest')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
