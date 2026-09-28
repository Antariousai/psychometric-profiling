# PROTTOY engine (Edge shared)

`engine.ts` is the same scoring code as `prottoy-pack/reference/engine.ts` (spec §12).

`scoreSession` scores only when the caller passes params, items, and mark payloads loaded with the service role. It does not invent marks.

There is no `golden_vectors_v3.json` in the pack, so this is not a bit-exact port of the unpublished author engine.
