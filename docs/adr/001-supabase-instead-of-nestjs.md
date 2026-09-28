# ADR 001 — Supabase Edge + RLS instead of NestJS scoring service (pilot)

**Status:** Accepted (pilot)  
**Date:** 2026-09-27  
**Context:** SPEC §1/§5 prescribe NestJS core + isolated scoring microservice + Vault. This Expo repo already runs on Supabase Auth, Postgres, and Edge Functions.

## Decision

For the PROTTOY pilot on this codebase:

- **Catalog** (constructs, categories, blueprint, items, options text) lives in Postgres (`prottoy_*` tables).
- **Marks / params** live in service-role-only tables (`prottoy_mark_entries`, `prottoy_param_sets`); JWT roles have no SELECT.
- **Scoring** runs in Supabase Edge Functions (`finalize-assessment`) using `SUPABASE_SERVICE_ROLE_KEY`, importing `_shared/prottoy-engine/`.
- **Score isolation** is enforced by RLS on `prottoy_scores`: FIELD_OFFICER / loan_officer cannot SELECT; BRANCH_MANAGER / CREDIT_COMMITTEE / PO_ADMIN can SELECT.
- **Field finalize response** is ACK-only (`sessionId`, `status: SCORED`) — never PS/WI/SRI/VI/flags in the JSON body.
- Full NestJS + Vault HSM remains the long-term SPEC target; this ADR is an explicit pilot stand-in.

## Consequences

- Faster ship on existing stack; golden-vector accuracy still requires `prottoy-pack/reference/engine.ts`.
- Must not regress: client `computeScore` is forbidden on the Prottoy feature path; `EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT=false` in prod.
- Manager / committee UIs read scores via PostgREST under manager RLS (or a dedicated Edge endpoint later).
