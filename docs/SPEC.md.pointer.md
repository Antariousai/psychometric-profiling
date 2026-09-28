# PROTTOY SPEC pointer

Canonical build specification lives at [`docs/SPEC.md`](./SPEC.md)
(copied from `PROTTOY_CURSOR_BUILD_SPEC.md`).

## Non-negotiables (field path)

1. **No keys on devices** — marks, weights, params, option-ID salt never reach Expo.
2. **No score on the device** — field app never computes, receives, or displays PS / WI / SRI / VI / bands / flags / reason codes / “correct” answers.
3. **Engine isolation** — scoring code lives under `supabase/functions/_shared/prottoy-engine/` only; field routes must not import it.
4. **Restricted data never committed** — `prottoy-pack/restricted/`, `*seed_keys*`, `*.keys.json` are gitignored and cursorignored.
5. **Human decides** — no automatic decline endpoint; managers record decisions.
6. **Consent first** — no Prottoy items before recorded consent.
7. **Finalize ACK only** — Edge `finalize-assessment` returns `{ ok, sessionId, status }` to field JWT; scores written server-side for manager RLS only.

See also: [`docs/adr/001-supabase-instead-of-nestjs.md`](./adr/001-supabase-instead-of-nestjs.md),
[`.cursor/rules/prottoy-field-no-scores.mdc`](../.cursor/rules/prottoy-field-no-scores.mdc).
