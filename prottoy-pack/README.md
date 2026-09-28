# PROTTOY data pack

Built from the Word volumes (not the unpublished author JSON):

- `data/item_bank_v3.json` — 2,608 items from Volume S1. No marks.
- `restricted/seed_keys_v0.3.json` — marks and parameters from the restricted scoring key. Gitignored. Option ids are local HMACs so they match this bank. The author’s original salt was not in the documents.
- `reference/engine.ts` — PROTTOY-1000 from build-spec sections 11–14 (`prottoy-1000-s12-1`).

`test/golden_vectors_v3.json` is still absent. Those vectors were produced by a generator that was not in the Word files, so this engine is not certified bit-for-bit against the author’s file.

Regenerate with:

```bash
python3 tools/build-prottoy-pack-from-docx.py
npx tsx tools/prottoy-score-smoke.ts
```

Import (service role only, after `supabase db push`):

```bash
node tools/import-prottoy-bank.mjs
node tools/import-prottoy-keys.mjs
```
