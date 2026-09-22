import { createClient } from 'npm:@supabase/supabase-js@2';
import { computeScore } from '../_shared/psymp-score.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Authoritative scoring + psychometric_assessment_rows write (service role). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authErr || !user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.session_id === 'string' ? body.session_id : null;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sess, error: sessErr } = await admin
      .from('assessment_sessions')
      .select('id, created_by, applicant_uuid')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr || !sess) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (sess.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: dims, error: dErr }, { data: qRows, error: qErr }, { data: respRows }] =
      await Promise.all([
        admin
          .from('psychometric_dimensions')
          .select('id,bn,en,color,icon')
          .order('sort_order', { ascending: true }),
        admin.from('psychometric_questions').select('id, payload').order('sort_order', { ascending: true }),
        admin
          .from('assessment_responses')
          .select('question_id, value, response_ms')
          .eq('session_id', sessionId),
      ]);

    if (dErr || qErr || !qRows?.length) {
      return new Response(JSON.stringify({ error: 'Could not load questions or dimensions' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const dimensionsList = dims ?? [];
    if (!dimensionsList.length) {
      return new Response(
        JSON.stringify({
          error: 'psychometric_dimensions is empty — run supabase/seed_reference_data.sql',
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const questions = qRows.map((row: { id: string; payload: Record<string, unknown> }) => ({
      ...(row.payload as object),
      id: row.id,
    }));

    /** @type {Record<string,{value:number,ms:number}>} */
    const answers = {};
    for (const row of respRows ?? []) {
      answers[row.question_id] = {
        value: row.value,
        ms: row.response_ms,
      };
    }

    const result = computeScore(
      answers as Record<string, { value: number; ms: number }>,
      questions,
      dimensionsList as unknown[],
    );

    const { error: upErr } = await admin.from('psychometric_assessment_results').upsert(
      {
        session_id: sessionId,
        applicant_uuid: sess.applicant_uuid,
        overall: result.overall,
        rating: result.rating != null ? String(result.rating).charAt(0) : null,
        risk_tier: result.risk,
        tenure_months: result.tenure,
        total_pct: result.totalPct,
        dimension_scores: result.dimScores,
        flags: result.flags,
        answers_snapshot: answers,
        algorithm_version: 'edge-finalize-v1',
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    );

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    await admin
      .from('assessment_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
