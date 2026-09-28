import { createClient } from 'npm:@supabase/supabase-js@2';
import { selectFollowUps, selectFollowupsStub, stripItemForField, hashSeed } from '../_shared/prottoy-engine/index.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Select 5 stripped follow-up items after core. No marks in response. */
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
      .select('id, created_by, prottoy_category, bank_version_id, key_version_id')
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

    const category = sess.prottoy_category;
    if (!category || !sess.bank_version_id) {
      return new Response(JSON.stringify({ error: 'Session has no Prottoy form — call assemble-form first' }), {
        status: 422,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: followups } = await admin
      .from('prottoy_items')
      .select('id, category, is_followup, format, natural_order, stem_bn, stem_en, role, construct')
      .eq('bank_version_id', sess.bank_version_id)
      .eq('category', category)
      .eq('is_followup', true)
      .eq('status', 'LIVE')
      .order('id', { ascending: true });

    let ids: string[] = [];
    const keyVersionId = sess.key_version_id;
    if (keyVersionId) {
      const { data: coreRows } = await admin
        .from('assessment_responses')
        .select('question_id, option_id')
        .eq('session_id', sessionId)
        .eq('is_followup', false);
      const coreIds = (coreRows || []).map((r) => r.question_id).filter(Boolean);
      const followIds = (followups || []).map((f) => f.id);
      const { data: coreItems } = await admin
        .from('prottoy_items')
        .select('id, role, format, construct, pair, side, pair_type, natural_order, is_followup')
        .in('id', coreIds.length ? coreIds : ['__none__']);
      const { data: marks } = await admin
        .from('prottoy_mark_entries')
        .select('item_id, payload')
        .eq('key_version_id', keyVersionId)
        .in('item_id', [...coreIds, ...followIds]);
      const markMap = new Map((marks || []).map((m) => [m.item_id, m.payload]));
      const coreItemMap = new Map((coreItems || []).map((i) => [i.id, i]));
      try {
        const core = (coreRows || []).map((r) => {
          const item = coreItemMap.get(r.question_id);
          const key = markMap.get(r.question_id);
          if (!item || !key) throw new Error('missing core key');
          return {
            item: {
              id: item.id,
              role: item.role,
              format: item.format,
              construct: item.construct,
              pair: item.pair,
              side: item.side,
              pairType: item.pair_type,
              naturalOrder: item.natural_order,
              extra: false,
            },
            key,
            optionId: r.option_id,
          };
        });
        const fu = (followups || []).map((item) => {
          const key = markMap.get(item.id);
          if (!key) throw new Error('missing follow-up key');
          return {
            item: {
              id: item.id,
              role: item.role,
              format: item.format,
              construct: item.construct,
              extra: true,
            },
            key,
          };
        });
        ids = selectFollowUps({ core, followUps: fu, rngSeed: hashSeed(sessionId) });
      } catch {
        ids = [];
      }
    }
    if (ids.length !== 5) ids = selectFollowupsStub(followups || [], category);

    const { data: opts } = await admin
      .from('prottoy_options')
      .select('id, item_id, position, text_bn, text_en')
      .in('item_id', ids);

    const byItem = new Map<string, NonNullable<typeof opts>>();
    for (const o of opts ?? []) {
      const list = byItem.get(o.item_id) || [];
      list.push(o);
      byItem.set(o.item_id, list);
    }
    const itemById = new Map((followups || []).map((i) => [i.id, i]));
    const stripped = ids.map((id) =>
      stripItemForField({
        ...itemById.get(id)!,
        options: byItem.get(id) || [],
      }),
    );

    await admin
      .from('assessment_sessions')
      .update({
        prottoy_status: 'CORE_DONE',
        followup_item_ids: ids,
      })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({ ok: true, sessionId, items: stripped }),
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
