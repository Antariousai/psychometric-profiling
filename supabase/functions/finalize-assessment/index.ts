import { createClient } from 'npm:@supabase/supabase-js@2';
import { computeScore } from '../_shared/psymp-score.ts';
import {
  ENGINE_VERSION,
  EnginePackMissingError,
  scoreSession,
  isEngineStub,
} from '../_shared/prottoy-engine/index.ts';
import { isAnonBearer, ownsSession } from '../_shared/field-auth.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCORE_KEYS = new Set([
  'ps', 'PS', 'wi', 'WI', 'wi1000', 'WI1000', 'sri', 'SRI', 'sri1000', 'SRI1000',
  'vi', 'VI', 'viBand', 'vi_band', 'band', 'flags', 'reason_codes', 'reasonCodes',
  'constructs', 'signals', 'recommendation', 'result', 'overall', 'rating',
  'dimScores', 'totalPct', 'risk', 'tenure',
]);

/** Strip any score-like keys from an object before returning to field JWT. */
function ackOnly(sessionId: string, status: string) {
  return { ok: true, sessionId, status };
}

function isProttoySession(sess: { prottoy_category?: string | null; metadata?: unknown }) {
  if (sess.prottoy_category) return true;
  const m = sess.metadata;
  if (m && typeof m === 'object' && !Array.isArray(m) && (m as { prottoy?: boolean }).prottoy) {
    return true;
  }
  return false;
}

/** Authoritative finalize. Prottoy field JWT gets ACK only — never PS/WI/SRI/VI. */
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

    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user ?? null;
    const anonField = !user?.id && isAnonBearer(authHeader, anonKey);
    if (!user?.id && !anonField) {
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
      .select('id, created_by, applicant_uuid, prottoy_category, bank_version_id, key_version_id, metadata, form_item_ids, followup_item_ids')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr || !sess) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!ownsSession(sess.created_by, user?.id ?? null, anonField)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Prottoy path: score server-side; ACK-only to field ─────────────────
    if (isProttoySession(sess)) {
      const { data: respRows } = await admin
        .from('assessment_responses')
        .select('question_id, option_id, value, response_ms, latency_ms, is_followup')
        .eq('session_id', sessionId);

      const responses = (respRows || []).map((r) => ({
        itemId: r.question_id,
        optionId: r.option_id,
        latencySeconds: (r.latency_ms ?? r.response_ms ?? 0) / 1000,
        followUp: Boolean(r.is_followup),
        // legacy numeric value ignored by real engine
        _legacyValue: r.value,
      }));

      let scored = false;
      let scoreError: string | null = null;

      try {
        if (isEngineStub) {
          throw new EnginePackMissingError('finalize Prottoy score');
        }
        const keyVersionId = sess.key_version_id;
        if (!keyVersionId) throw new EnginePackMissingError('finalize: session has no key version');
        const itemIds = [...new Set(responses.map((r) => r.itemId).filter(Boolean))];
        const [{ data: itemRows, error: itemErr }, { data: markRows, error: markErr }, { data: paramRow, error: paramErr }] =
          await Promise.all([
            admin
              .from('prottoy_items')
              .select('id, role, format, construct, pair, side, pair_type, natural_order, is_followup')
              .in('id', itemIds),
            admin
              .from('prottoy_mark_entries')
              .select('item_id, payload')
              .eq('key_version_id', keyVersionId)
              .in('item_id', itemIds),
            admin
              .from('prottoy_param_sets')
              .select('params')
              .eq('key_version_id', keyVersionId)
              .eq('category', sess.prottoy_category)
              .maybeSingle(),
          ]);
        if (itemErr) throw new Error(itemErr.message);
        if (markErr) throw new Error(markErr.message);
        if (paramErr) throw new Error(paramErr.message);
        if (!paramRow || !markRows?.length) {
          throw new EnginePackMissingError('finalize: scoring key not imported');
        }
        const items: Record<string, Record<string, unknown>> = {};
        for (const row of itemRows || []) {
          items[row.id] = {
            id: row.id,
            role: row.role,
            format: row.format,
            construct: row.construct,
            pair: row.pair,
            side: row.side,
            pairType: row.pair_type,
            naturalOrder: row.natural_order,
            extra: row.is_followup,
          };
        }
        const markMap: Record<string, Record<string, unknown>> = {};
        for (const row of markRows) markMap[row.item_id] = row.payload as Record<string, unknown>;

        const result = scoreSession({
          sessionId,
          category: sess.prottoy_category,
          responses,
          bankVersionId: sess.bank_version_id,
          keyVersionId,
          params: paramRow.params,
          items,
          keys: markMap,
        }) as Record<string, unknown>;

        // Defensive: never echo result to client even if we somehow got one.
        for (const k of Object.keys(result)) {
          if (SCORE_KEYS.has(k)) {
            /* intentional no-op — stored only */
          }
        }

        const { error: upErr } = await admin.from('prottoy_scores').upsert(
          {
            session_id: sessionId,
            engine_version: String(result.engineVersion ?? ENGINE_VERSION),
            key_version: String(result.keyVersion ?? sess.key_version_id ?? 'unknown'),
            bank_version: String(result.bankVersion ?? sess.bank_version_id ?? 'unknown'),
            ps: result.ps ?? result.PS ?? null,
            wi1000: result.wi1000 ?? result.WI1000 ?? null,
            sri1000: result.sri1000 ?? result.SRI1000 ?? null,
            vi: result.vi ?? result.VI ?? null,
            vi_band: result.viBand ?? result.vi_band ?? null,
            band: result.band ?? null,
            flags: result.flags ?? [],
            signals: result.signals ?? {},
            constructs: result.constructs ?? {},
            reason_codes: result.reasonCodes ?? result.reason_codes ?? [],
            recommendation: result.recommendation ?? null,
            inputs_digest: result.inputsDigest ?? null,
            signature: result.signature ?? null,
            visible_to_decision_makers: true,
            computed_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' },
        );
        if (upErr) throw new Error(upErr.message);
        scored = true;
      } catch (e) {
        scoreError = e instanceof Error ? e.message : String(e);
        console.error('[finalize-assessment] prottoy score', scoreError);
      }

      const status = scored ? 'SCORED' : 'SUBMITTED';
      await admin
        .from('assessment_sessions')
        .update({
          completed_at: new Date().toISOString(),
          prottoy_status: status,
          metadata: {
            ...(typeof sess.metadata === 'object' && sess.metadata ? sess.metadata : {}),
            prottoy: true,
            finalize_ack: true,
            ...(scoreError ? { score_pending: true, score_error: 'engine_unavailable' } : {}),
          },
        })
        .eq('id', sessionId);

      // STRICT: ACK only — no score keys in body for field JWT.
      return new Response(JSON.stringify(ackOnly(sessionId, status)), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Legacy PSYMP path (pre-Prottoy) — may return result for old UI ──────
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
    const answers: Record<string, { value: number; ms: number }> = {};
    for (const row of respRows ?? []) {
      answers[row.question_id] = {
        value: row.value,
        ms: row.response_ms,
      };
    }

    const result = computeScore(
      answers,
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

    // Legacy path still returns result for old result.js until Prottoy cutover.
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
