# PROTTOY cutover & acceptance (Phase 5)

## Feature flags

| Flag | Prod value | Notes |
|------|------------|--------|
| `EXPO_PUBLIC_PROTTOY_BANK` | `true` when cutting over | Category + consent + 40+5 + `/completion` |
| `EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT` | **`false`** | Never client-write scores on Prottoy path |
| `EXPO_PUBLIC_PREFER_EDGE_FINALIZE` | `true` | Finalize via Edge |

## Deploy checklist

1. Apply `supabase/migrations/004_prottoy_domain.sql`.
2. Place `prottoy-pack/` (see `prottoy-pack/README.md`).
3. Run `node tools/import-prottoy-bank.mjs` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `node tools/import-prottoy-keys.mjs` from a secure workstation (keys gitignored).
5. Port `prottoy-pack/reference/engine.ts` → `supabase/functions/_shared/prottoy-engine/` (replace stub).
6. Deploy Edge functions: `assemble-form`, `select-followups`, `finalize-assessment`.
7. Set staff `staff_profiles.role` to `BRANCH_MANAGER` / `CREDIT_COMMITTEE` / `PO_ADMIN` for manager UI.
8. Set Expo env: `EXPO_PUBLIC_PROTTOY_BANK=true`, `EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT=false`.

## Acceptance checks

### Field JWT — finalize ACK only

- Call `POST /functions/v1/finalize-assessment` with a Prottoy session as field officer.
- Response body **must** be shape `{ ok: true, sessionId, status }` where `status` is `SCORED` or `SUBMITTED`.
- Response body **must not** contain: `ps`, `PS`, `wi`, `wi1000`, `sri`, `sri1000`, `vi`, `flags`, `reason_codes`, `band`, `result`, `overall`.

### Field JWT — scores RLS

- As `FIELD_OFFICER` / `loan_officer`: `SELECT * FROM prottoy_scores` → **0 rows** / policy deny.
- As `BRANCH_MANAGER` / `CREDIT_COMMITTEE` / `PO_ADMIN`: can SELECT scores where `visible_to_decision_makers`.

### Marks isolation

- JWT roles: `SELECT` on `prottoy_mark_entries` / `prottoy_param_sets` → denied.
- Catalog assemble/followups payloads: stems + option text only (no marks, constructs, pair metadata).

### Field UI

- No `computeScore` on Prottoy path; `/result` and `/scoring` redirect to `/completion`.
- Completion screen shows sync/status only — no Freya score narrative or approve-by-score.

### Manager UI

- `/manager` and `/manager-session` gated by role; field officers see access denied.
- Decision outcomes recorded in `prottoy_decisions` (human decides).

### Engine / golden

- Until pack is present, engine stub **throws** on `scoreSession` and does not invent marks.
- When pack present: golden vectors (`test/golden_vectors_v3.json`) must pass ≤ 1e-9.

## Blockers without pack

- No `item_bank_v3.json` → assemble-form returns 422 after import missing.
- No `seed_keys` → import-keys fails; scoring cannot run.
- No `reference/engine.ts` → finalize stores `SUBMITTED` with `score_pending`, ACK still returned (no score body).
