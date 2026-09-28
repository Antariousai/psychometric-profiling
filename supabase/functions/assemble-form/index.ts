import { createClient } from 'npm:@supabase/supabase-js@2';
import { assembleForm, assembleFormStub, hashSeed, stripItemForField } from '../_shared/prottoy-engine/index.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Assemble 40 stripped core items for a Prottoy session. No marks. */
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
    const category = typeof body?.category === 'string' ? body.category.toUpperCase() : null;
    if (!sessionId || !category) {
      return new Response(JSON.stringify({ error: 'session_id and category required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!['JAG', 'AGR', 'SUF', 'BUN'].includes(category)) {
      return new Response(JSON.stringify({ error: 'invalid category' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sess, error: sessErr } = await admin
      .from('assessment_sessions')
      .select('id, created_by')
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

    const { data: bankRow } = await admin
      .from('prottoy_bank_versions')
      .select('id, version')
      .eq('status', 'LIVE')
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!bankRow) {
      return new Response(
        JSON.stringify({
          error: 'No LIVE prottoy bank — run tools/import-prottoy-bank.mjs with prottoy-pack',
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { data: items, error: iErr } = await admin
      .from('prottoy_items')
      .select('id, category, set_no, q, is_followup, format, natural_order, stem_bn, stem_en, est_seconds')
      .eq('bank_version_id', bankRow.id)
      .eq('category', category)
      .eq('is_followup', false)
      .eq('status', 'LIVE');

    if (iErr || !items?.length) {
      return new Response(JSON.stringify({ error: iErr?.message || 'No items for category' }), {
        status: 422,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const seed = body?.seed != null ? String(body.seed) : `${sessionId}:${category}`;
    const sets: string[][] = Array.from({ length: 15 }, () => Array(40).fill(''));
    const secondsById: Record<string, number> = {};
    for (const it of items) {
      const s = Number(it.set_no) - 1;
      const q = Number(it.q) - 1;
      if (s >= 0 && s < 15 && q >= 0 && q < 40) sets[s][q] = it.id;
      if (it.est_seconds != null) secondsById[it.id] = Number(it.est_seconds);
    }
    const gridReady = sets.every((row) => row.every((id) => id));
    let formIds: string[];
    if (!gridReady) {
      formIds = assembleFormStub(items, category, seed);
    } else {
      const vals = Object.values(secondsById);
      const target = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
      try {
        formIds = assembleForm({
          sets,
          seed: hashSeed(seed),
          secondsById,
          target,
          tolSeconds: 10,
        });
      } catch {
        formIds = assembleFormStub(items, category, seed);
      }
    }

    const { data: keyRow } = await admin
      .from('prottoy_key_versions')
      .select('id')
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: opts } = await admin
      .from('prottoy_options')
      .select('id, item_id, position, text_bn, text_en')
      .in('item_id', formIds);

    const byItem = new Map<string, typeof opts>();
    for (const o of opts ?? []) {
      const list = byItem.get(o.item_id) || [];
      list.push(o);
      byItem.set(o.item_id, list);
    }

    const itemById = new Map(items.map((i) => [i.id, i]));
    const stripped = formIds.map((id) => {
      const it = itemById.get(id)!;
      return stripItemForField({
        ...it,
        options: byItem.get(id) || [],
      });
    });

    await admin
      .from('assessment_sessions')
      .update({
        prottoy_category: category,
        prottoy_status: 'CREATED',
        bank_version_id: bankRow.id,
        key_version_id: keyRow?.id ?? null,
        form_item_ids: formIds,
        assembly_seed: seed,
        metadata: { prottoy: true, bank_version: bankRow.version },
      })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId,
        category,
        bankVersion: bankRow.version,
        items: stripped,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
