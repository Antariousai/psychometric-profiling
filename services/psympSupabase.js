import {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
} from '../lib/supabase';
import { PERSONAS } from '../data/personas';

function rowToQuestion(row) {
  if (!row?.payload || typeof row.payload !== 'object') return null;
  return { ...row.payload, id: row.id };
}

export async function fetchPsychometricQuestions() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await supabase
    .from('psychometric_questions')
    .select('id, sort_order, payload')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!data?.length) return [];
  return data.map(rowToQuestion).filter(Boolean);
}

/** @returns {Promise<Array<{id:string,bn:string,en:string,color:string,icon:string}>>} */
export async function fetchPsychometricDimensions() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await supabase
    .from('psychometric_dimensions')
    .select('id, bn, en, color, icon')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** @returns {Promise<{ applicantUuid: string, slug: string, profile: object } | null>} */
export async function fetchApplicantProfileBySlug(slug) {
  if (!isSupabaseConfigured || !supabase || !slug) return null;
  const { data, error } = await supabase
    .from('applicants')
    .select('id, slug, profile')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[psymp] fetchApplicantProfileBySlug', error.message);
    return null;
  }
  if (!data?.profile || typeof data.profile !== 'object') return null;
  return {
    applicantUuid: data.id,
    slug: data.slug,
    profile: data.profile,
  };
}

function profileForInsert(slug, profilePayload) {
  if (profilePayload && typeof profilePayload === 'object' && !Array.isArray(profilePayload)) {
    const { id: _drop, ...rest } = profilePayload;
    return { id: slug, ...rest };
  }
  return PERSONAS[slug] || { id: slug, name: slug, nameEn: slug };
}

async function ensureApplicantBySlug(slug, profilePayload = null) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: existing, error: selErr } = await supabase
    .from('applicants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (selErr) {
    console.warn('[psymp] ensureApplicantBySlug select', selErr.message);
    return null;
  }

  const hasPayload =
    profilePayload && typeof profilePayload === 'object' && !Array.isArray(profilePayload);

  if (existing?.id) {
    if (hasPayload) {
      const profile = profileForInsert(slug, profilePayload);
      const { error: upErr } = await supabase
        .from('applicants')
        .update({ profile })
        .eq('id', existing.id);
      if (upErr) console.warn('[psymp] ensureApplicantBySlug update profile', upErr.message);
    }
    return existing.id;
  }

  const profile = profileForInsert(slug, profilePayload);
  const { data: ins, error } = await supabase
    .from('applicants')
    .insert({
      slug,
      profile,
      is_demo: Boolean(PERSONAS[slug]),
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[psymp] ensureApplicantBySlug', error.message);
    return null;
  }
  return ins?.id ?? null;
}

/** @returns {Promise<{ sessionId: string, applicantUuid: string | null } | null>} */
export async function createAssessmentSession(applicantSlug, profilePayload = null) {
  if (!isSupabaseConfigured || !supabase) return null;
  const applicantUuid = await ensureApplicantBySlug(applicantSlug, profilePayload);
  const row = { applicant_id: applicantSlug, metadata: {} };
  if (applicantUuid) row.applicant_uuid = applicantUuid;
  const { data, error } = await supabase
    .from('assessment_sessions')
    .insert(row)
    .select('id, applicant_uuid')
    .single();
  if (error) throw error;
  return {
    sessionId: data?.id ?? null,
    applicantUuid: data?.applicant_uuid ?? applicantUuid ?? null,
  };
}

export async function saveAssessmentResponse(sessionId, questionId, value, responseMs) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('assessment_responses').upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      value,
      response_ms: responseMs,
    },
    { onConflict: 'session_id,question_id' },
  );
  if (error) console.warn('[psymp] saveAssessmentResponse', error.message);
}

export async function saveAssessmentResponsesBatch(sessionId, answersByQuestionId) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;
  const rows = Object.entries(answersByQuestionId).map(([question_id, a]) => ({
    session_id: sessionId,
    question_id,
    value: a.value,
    response_ms: a.ms,
  }));
  if (!rows.length) return;
  const { error } = await supabase.from('assessment_responses').upsert(rows, {
    onConflict: 'session_id,question_id',
  });
  if (error) console.warn('[psymp] saveAssessmentResponsesBatch', error.message);
}

export async function completeAssessmentSession(sessionId) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('assessment_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.warn('[psymp] completeAssessmentSession', error.message);
}

export async function savePsychometricAssessmentResult({
  sessionId,
  applicantUuid,
  result,
  answers,
}) {
  if (!sessionId || !isSupabaseConfigured || !supabase || !result) return;
  const { error } = await supabase.from('psychometric_assessment_results').upsert(
    {
      session_id: sessionId,
      applicant_uuid: applicantUuid,
      overall: result.overall,
      rating: result.rating != null ? String(result.rating).charAt(0) : null,
      risk_tier: result.risk,
      tenure_months: result.tenure,
      total_pct: result.totalPct,
      dimension_scores: result.dimScores,
      flags: result.flags,
      answers_snapshot: answers ?? null,
    },
    { onConflict: 'session_id' },
  );
  if (error) console.warn('[psymp] savePsychometricAssessmentResult', error.message);
}

/** Server-side authoritative score (migration 003+) — prefers Edge unless disabled. */
export async function finalizeAssessmentViaEdge(sessionId) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Signed out — cannot save assessment to server.');
  }

  const base = (supabaseUrl || '').replace(/\/?$/, '');
  const res = await fetch(`${base}/functions/v1/finalize-assessment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} finalize-assessment`);
  return body;
}

/**
 * Persist scored assessment: Edge Function first, optional client fallback for dev (RLS permits).
 */
export async function persistPsychometricAssessmentAuthoritative({
  sessionId,
  applicantUuid,
  result,
  answers,
}) {
  const preferEdge = process.env.EXPO_PUBLIC_PREFER_EDGE_FINALIZE !== 'false';

  try {
    if (preferEdge) {
      await finalizeAssessmentViaEdge(sessionId);
      return 'edge';
    }
  } catch (e) {
    console.warn('[psymp] Edge finalize unavailable', e?.message || e);
    if (process.env.EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT !== 'true') {
      throw e;
    }
  }

  await savePsychometricAssessmentResult({
    sessionId,
    applicantUuid,
    result,
    answers,
  });
  return 'client';
}

export async function saveCreditDecision({
  sessionId,
  applicantUuid,
  outcome,
  result,
}) {
  if (!sessionId) return;
  if (!isSupabaseConfigured || !supabase) {
    const { enqueue } = await import('../utils/syncQueue');
    await enqueue({ type: 'decision', payload: { sessionId, applicantUuid, outcome, result } });
    return;
  }
  const { error } = await supabase.from('credit_decisions').insert({
    session_id: sessionId,
    applicant_uuid: applicantUuid,
    outcome,
    overall_score: result?.overall ?? null,
    rating: result?.rating ?? null,
    flag_count: result?.flags?.length ?? 0,
  });
  if (error) console.warn('[psymp] saveCreditDecision', error.message);
}

/**
 * Flush any queued assessment results that were saved while offline.
 * Safe to call at app boot — no-ops when queue is empty or Supabase is unavailable.
 * @returns {Promise<number>} count of successfully flushed items
 */
export async function flushSyncQueue() {
  if (!isSupabaseConfigured) return 0;
  const { loadQueue, removeFromQueue } = await import('../utils/syncQueue');
  const queue = await loadQueue();
  if (!queue.length) return 0;
  let flushed = 0;
  for (const item of queue) {
    try {
      if (item.type === 'assessment') {
        await savePsychometricAssessmentResult(item.payload);
        await removeFromQueue(item.enqueuedAt);
        flushed++;
      } else if (item.type === 'decision') {
        await saveCreditDecision(item.payload);
        await removeFromQueue(item.enqueuedAt);
        flushed++;
      }
    } catch {
      // Keep item in queue if it still fails; retry next time.
    }
  }
  return flushed;
}

/**
 * Fetch recent assessment sessions joined with applicant profile + result + decision.
 * Returns up to `limit` rows newest-first.
 * @returns {Promise<Array>}
 */
export async function fetchRecentSessions(limit = 20) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select(`
      id,
      applicant_id,
      created_at,
      completed_at,
      applicants ( id, slug, profile ),
      psychometric_assessment_results ( overall, rating, risk_tier, flags ),
      credit_decisions ( outcome, decided_at )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[psymp] fetchRecentSessions', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch officer-level aggregates: total sessions, avg score, approval rate, flag rate.
 * @returns {Promise<{ total: number, avgScore: number, approvalRate: number, flagRate: number } | null>}
 */
export async function fetchOfficerStats() {
  if (!isSupabaseConfigured || !supabase) return null;
  const [sessRes, decRes] = await Promise.all([
    supabase
      .from('psychometric_assessment_results')
      .select('overall, flags'),
    supabase
      .from('credit_decisions')
      .select('outcome'),
  ]);
  if (sessRes.error || decRes.error) return null;

  const results = sessRes.data ?? [];
  const decisions = decRes.data ?? [];

  const total = results.length;
  const avgScore = total
    ? Math.round(results.reduce((s, r) => s + (r.overall ?? 0), 0) / total)
    : 0;
  const flaggedCount = results.filter(r => Array.isArray(r.flags) && r.flags.length > 0).length;
  const approvedCount = decisions.filter(d => d.outcome === 'approved').length;
  const approvalRate = decisions.length
    ? Math.round((approvedCount / decisions.length) * 100)
    : 0;
  const flagRate = total ? Math.round((flaggedCount / total) * 100) : 0;

  return { total, avgScore, approvalRate, flagRate };
}
