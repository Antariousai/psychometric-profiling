#!/usr/bin/env node
/**
 * Import PROTTOY restricted scoring keys (service role only).
 *
 * Required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PROTTOY_PACK_DIR (default: ./prottoy-pack)
 *
 * Expects: prottoy-pack/restricted/seed_keys_v0.3.json
 * NEVER commit that file. NEVER expose via anon/authenticated RLS.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const packDir = resolve(process.env.PROTTOY_PACK_DIR || './prottoy-pack');
const keysPath = join(packDir, 'restricted', 'seed_keys_v0.3.json');

function fail(msg) {
  console.error(`[import-prottoy-keys] ERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(keysPath)) {
  fail(
    `Missing restricted keys at ${keysPath}.\n` +
      `Place seed_keys_v0.3.json under prottoy-pack/restricted/ (gitignored).\n` +
      `Do not invent marks. Obtain the official pack.`,
  );
}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail('SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const seed = JSON.parse(readFileSync(keysPath, 'utf8'));
const version = seed.keyVersion || 'v0.3-seed';
const keyVersionId = `key-${version}`;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`[import-prottoy-keys] Importing key version ${version}`);

  const { error: kvErr } = await supabase.from('prottoy_key_versions').upsert(
    { id: keyVersionId, version, checksum: null, activated_at: new Date().toISOString() },
    { onConflict: 'id' },
  );
  if (kvErr) fail(kvErr.message);

  const categories = seed.categories || {};
  for (const [cat, block] of Object.entries(categories)) {
    const { error: pErr } = await supabase.from('prottoy_param_sets').upsert(
      {
        key_version_id: keyVersionId,
        category: cat,
        params: block.params || {},
      },
      { onConflict: 'key_version_id,category' },
    );
    if (pErr) fail(`param_sets ${cat}: ${pErr.message}`);

    const items = block.items || {};
    const rows = Object.entries(items).map(([itemId, payload]) => ({
      key_version_id: keyVersionId,
      item_id: itemId,
      payload,
    }));
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const { error } = await supabase
        .from('prottoy_mark_entries')
        .upsert(rows.slice(i, i + chunk), { onConflict: 'key_version_id,item_id' });
      if (error) fail(`mark_entries ${cat}: ${error.message}`);
    }
    console.log(`[import-prottoy-keys] ${cat}: ${rows.length} mark entries`);
  }

  console.log('[import-prottoy-keys] Done. Marks are service-role only.');
}

main().catch((e) => fail(e?.message || String(e)));
