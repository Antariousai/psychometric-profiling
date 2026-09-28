#!/usr/bin/env node
/**
 * Import PROTTOY item bank (no marks) into Supabase via service role.
 *
 * Required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PROTTOY_PACK_DIR (default: ./prottoy-pack)
 *
 * Expects: prottoy-pack/data/item_bank_v3.json
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const packDir = resolve(process.env.PROTTOY_PACK_DIR || './prottoy-pack');
const bankPath = join(packDir, 'data', 'item_bank_v3.json');

function fail(msg) {
  console.error(`[import-prottoy-bank] ERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(bankPath)) {
  fail(
    `Missing item bank at ${bankPath}.\n` +
      `Place the official pack under prottoy-pack/ (see prottoy-pack/README.md).\n` +
      `Required: data/item_bank_v3.json`,
  );
}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail('SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const bank = JSON.parse(readFileSync(bankPath, 'utf8'));
const version = bank.version || '3.0.0';
const bankVersionId = `bank-${version}`;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsert(table, rows, onConflict) {
  if (!rows?.length) return;
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(slice, { onConflict });
    if (error) fail(`${table}: ${error.message}`);
  }
}

async function main() {
  console.log(`[import-prottoy-bank] Importing bank ${version} from ${bankPath}`);

  const constructs = (bank.constructs || []).map((c, i) => ({
    id: c.c,
    bn: c.bn || c.c,
    en: c.en || c.c,
    idx: c.idx || 'WI',
    def: c.def || null,
    sort_order: i,
  }));
  await upsert('prottoy_constructs', constructs, 'id');

  const categories = (bank.categories || []).map((c) => ({
    code: c.code,
    bn: c.bn || c.code,
    en: c.en || c.code,
    description: c.desc || c.description || null,
  }));
  await upsert('prottoy_categories', categories, 'code');

  await upsert(
    'prottoy_bank_versions',
    [{ id: bankVersionId, version, checksum: null, status: 'LIVE' }],
    'id',
  );

  const blueprint = (bank.blueprint || []).map((b) => ({
    bank_version_id: bankVersionId,
    q: b.q,
    slot: b.slot,
    kind: b.kind || null,
    pair: b.pair || null,
    side: b.side || null,
    construct: b.construct || null,
    format: b.format || null,
    pair_type: b.pairType || null,
  }));
  await upsert('prottoy_blueprint', blueprint, 'bank_version_id,q');

  const items = [];
  const options = [];
  const followups = [];

  const banks = bank.banks || {};
  for (const [cat, block] of Object.entries(banks)) {
    for (const set of block.sets || []) {
      for (const it of set.items || []) {
        items.push({
          id: it.id,
          bank_version_id: bankVersionId,
          category: it.category || cat,
          set_no: it.set ?? null,
          slot: it.slot || null,
          q: it.q ?? null,
          is_followup: Boolean(it.extra),
          construct: it.construct || null,
          role: it.role || 'SCORED',
          format: it.format || 'GR',
          pair: it.pair || null,
          side: it.side || null,
          pair_type: it.pairType || null,
          natural_order: it.naturalOrder !== false,
          shuffle: Boolean(it.shuffle),
          stem_bn: it.stem?.bn || '',
          stem_en: it.stem?.en || null,
          words: it.words ?? null,
          est_seconds: it.estSeconds ?? null,
          status: 'LIVE',
        });
        (it.options || []).forEach((o, pos) => {
          options.push({
            id: o.id,
            item_id: it.id,
            position: pos,
            text_bn: o.bn || '',
            text_en: o.en || null,
          });
        });
      }
    }
    for (const it of block.followUps || []) {
      items.push({
        id: it.id,
        bank_version_id: bankVersionId,
        category: it.category || cat,
        set_no: it.set ?? null,
        slot: it.slot || null,
        q: it.q ?? null,
        is_followup: true,
        construct: it.construct || null,
        role: it.role || 'SCORED',
        format: it.format || 'GR',
        pair: it.pair || null,
        side: it.side || null,
        pair_type: it.pairType || null,
        natural_order: it.naturalOrder !== false,
        shuffle: Boolean(it.shuffle),
        stem_bn: it.stem?.bn || '',
        stem_en: it.stem?.en || null,
        words: it.words ?? null,
        est_seconds: it.estSeconds ?? null,
        status: 'LIVE',
      });
      (it.options || []).forEach((o, pos) => {
        options.push({
          id: o.id,
          item_id: it.id,
          position: pos,
          text_bn: o.bn || '',
          text_en: o.en || null,
        });
      });
      followups.push({
        item_id: it.id,
        category: it.category || cat,
        twin_of: it.twinOf || null,
        kind: it.role || 'twin',
        meta: {},
      });
    }
  }

  console.log(`[import-prottoy-bank] ${items.length} items, ${options.length} options, ${followups.length} followups`);
  await upsert('prottoy_items', items, 'id');
  await upsert('prottoy_options', options, 'item_id,id');
  await upsert('prottoy_followups', followups, 'item_id');

  console.log('[import-prottoy-bank] Done.');
}

main().catch((e) => fail(e?.message || String(e)));
