/**
 * PROTTOY backend callers for Expo (field + manager).
 * Field path must never display or rely on score fields from finalize.
 */
import {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
} from '../lib/supabase';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Signed out — cannot call Prottoy Edge functions.');
  return {
    Authorization: `Bearer ${token}`,
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };
}

async function invokeEdge(name, body) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
  const base = (supabaseUrl || '').replace(/\/?$/, '');
  const res = await fetch(`${base}/functions/v1/${name}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${res.status} ${name}`);
  return json;
}

/** @returns {Promise<{sessionId:string, items:Array, category:string, bankVersion:string}>} */
export async function assembleProttoyForm(sessionId, category) {
  return invokeEdge('assemble-form', { session_id: sessionId, category });
}

/** @returns {Promise<{sessionId:string, items:Array}>} */
export async function selectProttoyFollowups(sessionId) {
  return invokeEdge('select-followups', { session_id: sessionId });
}

/**
 * Finalize Prottoy session. Response is ACK-only for field JWT:
 * { ok, sessionId, status } — never PS/WI/SRI/VI.
 */
export async function finalizeProttoyAssessment(sessionId) {
  const body = await invokeEdge('finalize-assessment', { session_id: sessionId });
  return {
    ok: Boolean(body.ok),
    sessionId: body.sessionId || sessionId,
    status: body.status || 'SUBMITTED',
  };
}

export async function recordProttoyConsent(sessionId, { accepted, version = 'bn-1.2' }) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('assessment_sessions')
    .update({
      consent_accepted: Boolean(accepted),
      consent_at: new Date().toISOString(),
      consent_version: version,
      prottoy_status: accepted ? 'CONSENTED' : 'VOID',
    })
    .eq('id', sessionId);
  if (error) console.warn('[prottoy] recordProttoyConsent', error.message);
}

export async function saveProttoyResponse(sessionId, itemRef, optionId, latencyMs, { isFollowup = false, position = null } = {}) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('assessment_responses').upsert(
    {
      session_id: sessionId,
      question_id: itemRef,
      value: 0,
      response_ms: latencyMs,
      option_id: optionId,
      latency_ms: latencyMs,
      is_followup: isFollowup,
      position,
    },
    { onConflict: 'session_id,question_id' },
  );
  if (error) console.warn('[prottoy] saveProttoyResponse', error.message);
}

/** Map stripped Edge item → assessment UI shape (option id string, no scores). */
export function strippedItemToQuestion(item, { isFollowup = false } = {}) {
  return {
    id: item.itemRef,
    type: 'mcq',
    format: item.format,
    naturalOrder: item.naturalOrder !== false,
    dim: 'prottoy',
    isFollowup,
    bn: item.stem?.bn || '',
    en: item.stem?.en || '',
    options: (item.options || []).map((o) => ({
      id: o.optionRef,
      bn: o.bn,
      en: o.en,
    })),
  };
}

export async function fetchStaffProfile() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, officer_code, org_id, branch_id')
    .eq('id', uid)
    .maybeSingle();
  if (error) {
    console.warn('[prottoy] fetchStaffProfile', error.message);
    return null;
  }
  return data;
}

/** Manager-only: list recent Prottoy sessions with scores (RLS enforces). */
export async function fetchProttoySessionsForManager(limit = 30) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select(`
      id,
      applicant_id,
      prottoy_category,
      prottoy_status,
      created_at,
      completed_at,
      applicants ( id, slug, profile ),
      prottoy_scores (
        ps, wi1000, sri1000, vi, vi_band, band, flags, reason_codes, recommendation, visible_to_decision_makers
      ),
      prottoy_decisions ( id, outcome, recommended, override, override_reason, loan_amount_bdt, notes, decided_at )
    `)
    .not('prottoy_category', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[prottoy] fetchProttoySessionsForManager', error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchProttoyScore(sessionId) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('prottoy_scores')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) {
    console.warn('[prottoy] fetchProttoyScore', error.message);
    return null;
  }
  return data;
}

export async function saveProttoyDecision({
  sessionId,
  outcome,
  recommended = null,
  override = false,
  overrideReason = null,
  loanAmountBdt = null,
  notes = null,
}) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('prottoy_decisions')
    .insert({
      session_id: sessionId,
      decider_id: auth?.user?.id ?? null,
      outcome,
      recommended,
      override,
      override_reason: overrideReason,
      loan_amount_bdt: loanAmountBdt,
      notes,
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[prottoy] saveProttoyDecision', error.message);
    throw error;
  }
  return data;
}
