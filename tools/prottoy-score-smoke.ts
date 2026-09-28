/**
 * Smoke-check the parsed pack and the §12 engine.
 * Prints scores only — never marks or the option-id salt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleForm, score, selectFollowUps, type ItemMeta, type MarkPayload } from "../prottoy-pack/reference/engine.ts";

const root = resolve(import.meta.dirname, "..");
const bank = JSON.parse(readFileSync(resolve(root, "prottoy-pack/data/item_bank_v3.json"), "utf8"));
const keys = JSON.parse(readFileSync(resolve(root, "prottoy-pack/restricted/seed_keys_v0.3.json"), "utf8"));

function metaOf(it: Record<string, unknown>): ItemMeta {
  return {
    id: String(it.id),
    role: String(it.role),
    format: String(it.format),
    construct: (it.construct as string) ?? null,
    pair: (it.pair as string) ?? null,
    side: (it.side as string) ?? null,
    pairType: (it.pairType as string) ?? null,
    naturalOrder: Boolean(it.naturalOrder),
    extra: Boolean(it.extra),
  };
}

let items = 0;
for (const block of Object.values(bank.banks) as Array<{ sets: Array<{ items: unknown[] }>; followUps: unknown[] }>) {
  for (const set of block.sets) items += set.items.length;
  items += block.followUps.length;
}
if (items !== 2608) throw new Error(`item count ${items}`);

const jag = bank.banks.JAG;
const set0 = jag.sets[0].items as Array<Record<string, unknown>>;
const itemMap: Record<string, ItemMeta> = {};
const keyMap: Record<string, MarkPayload> = keys.categories.JAG.items;
for (const it of set0) itemMap[String(it.id)] = metaOf(it);
for (const it of jag.followUps as Array<Record<string, unknown>>) itemMap[String(it.id)] = metaOf(it);

const responses = set0.map((it, i) => {
  const opts = it.options as Array<{ id: string }>;
  return { itemId: String(it.id), optionId: opts[0].id, latencySeconds: 8, position: i, followUp: false };
});

const result = score({
  category: "JAG",
  params: keys.categories.JAG.params,
  items: itemMap,
  keys: keyMap,
  responses,
  sessionId: "smoke",
  keyVersion: keys.keyVersion,
  bankVersion: bank.version,
}) as { ps: number; wi1000: number; sri1000: number; vi: number; flags: string[]; recommendation: string };

if (result.ps < 0 || result.ps > 1000) throw new Error(`PS out of range ${result.ps}`);
if (result.vi < 0 || result.vi > 1) throw new Error(`VI out of range ${result.vi}`);

const failAtt = set0.map((it, i) => {
  const role = String(it.role);
  const opts = it.options as Array<{ id: string }>;
  const key = keyMap[String(it.id)];
  let optionId = opts[opts.length - 1].id;
  if (role === "ATT" && key.pass) optionId = key.pass === "affirm" ? "deny" : "affirm";
  return { itemId: String(it.id), optionId, latencySeconds: 8, position: i };
});
const capped = score({
  category: "JAG",
  params: keys.categories.JAG.params,
  items: itemMap,
  keys: keyMap,
  responses: failAtt,
}) as { flags: string[]; ps: number };
if (!capped.flags.includes("RETEST")) throw new Error("two attention failures did not flag RETEST");
if (capped.ps > Math.round(1000 * keys.categories.JAG.params.cap) + 1) {
  throw new Error(`cap not applied ps=${capped.ps}`);
}

const sets = (jag.sets as Array<{ items: Array<{ id: string; estSeconds: number; pair?: string }> }>).map((s) =>
  s.items.map((it) => it.id),
);
const seconds: Record<string, number> = {};
for (const s of jag.sets as Array<{ items: Array<{ id: string; estSeconds: number }> }>) {
  for (const it of s.items) seconds[it.id] = it.estSeconds;
}
const target = Object.values(seconds).reduce((a, b) => a + b, 0) / 15;
const form = assembleForm({ sets, seed: 12345, secondsById: seconds, target, tolSeconds: 10 });
if (form.length !== 40) throw new Error("form length");
const pairOf = new Map<string, { pair: string; set: string }>();
for (const s of jag.sets as Array<{ setId: string; items: Array<{ id: string; pair?: string | null }> }>) {
  for (const it of s.items) if (it.pair) pairOf.set(it.id, { pair: it.pair, set: s.setId });
}
const seen = new Map<string, string>();
for (const id of form) {
  const info = pairOf.get(id);
  if (!info) continue;
  const prev = seen.get(info.pair);
  if (prev && prev !== info.set) throw new Error(`pair ${info.pair} split across sets`);
  seen.set(info.pair, info.set);
}

const core = set0.map((it) => ({
  item: itemMap[String(it.id)],
  key: keyMap[String(it.id)],
  optionId: (it.options as Array<{ id: string }>)[0].id,
}));
const followUps = (jag.followUps as Array<Record<string, unknown>>).map((it) => ({
  item: itemMap[String(it.id)],
  key: keyMap[String(it.id)],
}));
const picked = selectFollowUps({ core, followUps, rngSeed: 99 });
if (picked.length !== 5) throw new Error("follow-ups");

console.log(JSON.stringify({
  items,
  jagMeanCheck: "ok",
  sample: { ps: result.ps, wi1000: result.wi1000, sri1000: result.sri1000, vi: Number(result.vi.toFixed(4)), recommendation: result.recommendation },
  attentionCap: { ps: capped.ps, flags: capped.flags },
  form: form.length,
  followUps: picked.length,
}));
