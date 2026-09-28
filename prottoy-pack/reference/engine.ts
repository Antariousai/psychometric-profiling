/**
 * PROTTOY-1000 scoring, follow-up selection, and form assembly.
 *
 * Implemented from PROTTOY_CURSOR_BUILD_SPEC.md §11.2, §12, §13, and §14.
 * This is not the author's unpublished reference/engine.ts. Golden vectors
 * were not in the Word volumes, so bit-exact agreement with that file is
 * not claimed. Formulas follow the spec; do not add marks that are not in
 * the key payload.
 */
import { createHash, createHmac } from "node:crypto";

export const ENGINE_VERSION = "prottoy-1000-s12-1";

const LATENCY_NORM: Record<string, number> = { GR: 5, SJ: 6, PJ: 5.5, CH: 6, FC: 7, TF: 3.5 };
const LOG_LATENCY_SD = 0.45;
const FAST_Z = -1.5;
const PRESENT_BIAS_FLAG = 0.45;
const W_SET = ["C1", "C2", "C3", "C4", "C5", "C11"];
const S_SET = ["C3", "C6", "C7", "C8", "C9", "C10", "C11"];
const CONSTRUCTS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11"];
/** Pair id for blueprint slots Q01..Q40. Null = not a paired item. */
const SLOT_PAIR: Array<string | null> = [
  "P1", "P4", "P6", "P8", "P12", "P14", "P2", "P13", "P9", null,
  "P3", "P10", "P15", "P11", null, null, "P5", null, "P4", "P7",
  "P1", "P2", null, "P6", null, "P8", "P9", "P12", null, "P14",
  "P5", "P13", null, "P3", "P10", "P15", "P11", "P7", null, null,
];

const CONSTRUCT_EN: Record<string, string> = {
  C1: "Integrity",
  C2: "Obligation & promise-keeping",
  C3: "Locus of control",
  C4: "Social accountability",
  C5: "Default rationalisation",
  C6: "Self-control",
  C7: "Money attitudes",
  C8: "Patience",
  C9: "Lure & risk susceptibility",
  C10: "Resilience & coping",
  C11: "Debt attitude",
};

export type ItemMeta = {
  id: string;
  role: string;
  format: string;
  construct?: string | null;
  pair?: string | null;
  side?: string | null;
  pairType?: string | null;
  naturalOrder?: boolean;
  extra?: boolean;
};

export type MarkPayload = {
  w: number;
  marks?: Record<string, number>;
  firstOptionId?: string;
  dir?: number;
  fc?: Record<string, string>;
  fcKeyedA?: string;
  fcKeyedB?: string;
  pass?: string;
  flagIf?: string;
};

export type ScoreParams = {
  cons: Record<string, { alpha: number; beta: number; mu: number }>;
  lamW: Record<string, number>;
  lamS: Record<string, number>;
  pi: number;
  omega: Record<string, number>;
  fc: { other: number; filler: number };
  vi: Record<string, number>;
  doubt: number;
  thr: { s1: number; s1w: number; s3: number; s4: number; s5: number; s6?: number; pd: number };
  lat: { zmin: number; kappa: number; rhoMin: number };
  cap: number;
};

export type ResponseIn = {
  itemId: string;
  optionId: string;
  latencySeconds?: number;
  followUp?: boolean;
  position?: number;
};

type Side = { construct: string; w: number; rho: number; m: number; pairType: string | null };

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function clip01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return clamp(x, 0, 1);
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

function latencyWeight(seconds: number | undefined, format: string, lat: ScoreParams["lat"]): { rho: number; fast: boolean } {
  // Missing timing is not evidence of rushing. ln(0) would flag every unanswered clock.
  if (!(typeof seconds === "number" && seconds > 0)) return { rho: 1, fast: false };
  const norm = LATENCY_NORM[format] ?? 5;
  const z = (Math.log(seconds) - Math.log(norm)) / LOG_LATENCY_SD;
  const fast = z < FAST_Z;
  const rho = clamp(1 - lat.kappa * Math.max(0, lat.zmin - z), lat.rhoMin, 1);
  return { rho, fast };
}

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function score(input: {
  category: string;
  params: ScoreParams;
  items: Record<string, ItemMeta>;
  keys: Record<string, MarkPayload>;
  responses: ResponseIn[];
  sessionId?: string;
  keyVersion?: string;
  bankVersion?: string;
  signKey?: string;
}): Record<string, unknown> {
  const { params } = input;
  const num: Record<string, number> = {};
  const den: Record<string, number> = {};
  const add = (c: string, n: number, d: number) => {
    num[c] = (num[c] ?? 0) + n;
    den[c] = (den[c] ?? 0) + d;
  };

  let attFail = 0;
  let im = 0;
  let imN = 0;
  let fast = 0;
  let tetrads = 0;
  let keyedTetrads = 0;
  const coreSides = new Map<string, { a?: Side; b?: Side }>();
  const coreRawByC: Record<string, number[]> = {};
  const followRaw: Array<{ c: string; m: number }> = [];
  const grMarks: number[] = [];
  let firstHits = 0;
  let firstN = 0;
  let p14a: number | null = null;
  let p14b: number | null = null;

  for (const r of input.responses) {
    const item = input.items[r.itemId];
    const key = input.keys[r.itemId];
    if (!item || !key) throw new Error(`score: missing item or key for ${r.itemId}`);
    const { rho, fast: isFast } = latencyWeight(r.latencySeconds, item.format, params.lat);
    if (isFast) fast += 1;
    const w = key.w;
    const followUp = Boolean(r.followUp || item.extra);

    if (item.role === "ATT") {
      if (r.optionId !== key.pass) attFail += 1;
      continue;
    }
    if (item.role === "VIR" || item.role === "ADM") {
      imN += 1;
      if (r.optionId === key.flagIf) im += 1;
      continue;
    }
    if (item.role === "FC") {
      const ch = key.fc?.[r.optionId];
      const A = key.fcKeyedA;
      const B = key.fcKeyedB;
      if (!ch || !A || !B) throw new Error(`score: tetrad key incomplete for ${r.itemId}`);
      tetrads += 1;
      if (ch === "F") {
        add(A, w * rho * params.fc.filler, w * rho);
        add(B, w * rho * params.fc.filler, w * rho);
      } else {
        keyedTetrads += 1;
        const other = ch === A ? B : A;
        add(ch, w * rho * 1, w * rho);
        add(other, w * rho * params.fc.other, w * rho);
      }
      continue;
    }

    const m = key.marks?.[r.optionId];
    if (m == null || !item.construct) throw new Error(`score: no mark for ${r.itemId}`);
    add(item.construct, w * rho * m, w * rho);
    if (!followUp) {
      (coreRawByC[item.construct] ??= []).push(m);
      if (item.format === "GR") grMarks.push(m);
      if ((item.format === "GR" || item.format === "PJ") && item.naturalOrder !== false) {
        firstN += 1;
        if (key.firstOptionId && r.optionId === key.firstOptionId) firstHits += 1;
      }
      if (item.pair && item.side) {
        const bucket = coreSides.get(item.pair) ?? {};
        bucket[item.side === "b" ? "b" : "a"] = {
          construct: item.construct,
          w,
          rho,
          m,
          pairType: item.pairType ?? null,
        };
        coreSides.set(item.pair, bucket);
      }
      if (item.pair === "P14" && item.side === "a") p14a = m;
      if (item.pair === "P14" && item.side === "b") p14b = m;
    } else {
      followRaw.push({ c: item.construct, m });
    }
  }

  for (const bucket of coreSides.values()) {
    if (!bucket.a || !bucket.b) continue;
    const gap = Math.abs(bucket.a.m - bucket.b.m);
    if (gap > params.thr.pd) {
      const high = bucket.a.m >= bucket.b.m ? bucket.a : bucket.b;
      num[high.construct] = (num[high.construct] ?? 0) - high.w * high.rho * gap;
    }
  }

  const theta: Record<string, number> = {};
  const thetaP: Record<string, number> = {};
  const rScore: Record<string, number> = {};
  let pdiNum = 0;
  let pdiDen = 0;
  for (const [pair, bucket] of coreSides) {
    if (!bucket.a || !bucket.b) continue;
    const wType = params.omega[bucket.a.pairType ?? ""] ?? 0;
    if (wType === 0) continue;
    pdiNum += wType * Math.abs(bucket.a.m - bucket.b.m);
    pdiDen += wType;
    void pair;
  }
  const PDI = pdiDen === 0 ? 0 : pdiNum / pdiDen;

  const coreR: Record<string, number> = {};
  for (const c of CONSTRUCTS) {
    const mu = params.cons[c]?.mu ?? 0.5;
    const raw = coreRawByC[c];
    if (raw?.length) coreR[c] = raw.reduce((a, b) => a + b, 0) / raw.length;
    const rc = (den[c] ?? 0) === 0 ? mu : (num[c] ?? 0) / den[c];
    rScore[c] = rc;
    const alpha = params.cons[c]?.alpha ?? 1;
    const beta = params.cons[c]?.beta ?? 0.5;
    theta[c] = 1 / (1 + Math.exp(-alpha * (rc - beta)));
  }

  const twinDiffs: number[] = [];
  for (const fu of followRaw) {
    const base = coreR[fu.c];
    if (base == null) continue;
    twinDiffs.push(Math.abs(fu.m - base));
  }
  const Dtwin = twinDiffs.length ? twinDiffs.reduce((a, b) => a + b, 0) / twinDiffs.length : PDI;
  const IM = im / Math.max(1, imN);
  const GR = mean(grMarks) ?? 0.5;
  const FCk = tetrads === 0 ? 1 : keyedTetrads / tetrads;
  const first = firstN === 0 ? 0 : firstHits / firstN;
  const fastShare = input.responses.length === 0 ? 0 : fast / input.responses.length;
  const s6start = params.thr.s6 ?? 0.1;

  const S1 = clip01(((1 - params.thr.s1w) * PDI + params.thr.s1w * Dtwin - params.thr.s1) / 0.2);
  const S2 = clip01(attFail / 2);
  const S3 = clip01((IM - params.thr.s3) / (0.75 - params.thr.s3));
  const S4 = clip01((GR - FCk - params.thr.s4) / 0.35);
  const S5 = clip01((first - params.thr.s5) / (1 - params.thr.s5));
  const S6 = clip01((fastShare - s6start) / 0.3);
  const signals = { PDI, D_twin: Dtwin, IM, GR, FCk, first, fastShare, S1, S2, S3, S4, S5, S6 };
  const viSum =
    (params.vi.S1 ?? 0) * S1 +
    (params.vi.S2 ?? 0) * S2 +
    (params.vi.S3 ?? 0) * S3 +
    (params.vi.S4 ?? 0) * S4 +
    (params.vi.S5 ?? 0) * S5 +
    (params.vi.S6 ?? 0) * S6;
  const VI = 1 - Math.min(1, viSum);

  let WI = 0;
  let SRI = 0;
  for (const c of CONSTRUCTS) {
    const mu = params.cons[c]?.mu ?? 0.5;
    const muP = mu * (1 - params.doubt * (1 - VI));
    const thP = muP + VI * (theta[c] - muP);
    thetaP[c] = thP;
  }
  for (const c of W_SET) WI += (params.lamW[c] ?? 0) * thetaP[c];
  for (const c of S_SET) SRI += (params.lamS[c] ?? 0) * thetaP[c];
  let G = Math.pow(Math.max(WI, 0), params.pi) * Math.pow(Math.max(SRI, 0), 1 - params.pi);

  const flags: string[] = [];
  if (attFail >= 2) {
    G = Math.min(G, params.cap);
    flags.push("RETEST");
  }
  if (p14a != null && p14b != null && p14b - p14a > PRESENT_BIAS_FLAG) flags.push("PRESENT-BIAS");

  const PS = Math.round(1000 * G);
  const WI1000 = Math.round(1000 * WI);
  const SRI1000 = Math.round(1000 * SRI);
  const band = PS >= 700 ? "A" : PS >= 580 ? "B" : PS >= 460 ? "C" : "D";
  const viBand = VI >= 0.7 ? "High" : VI >= 0.5 ? "Medium" : "Low";

  const reasonCodes: string[] = [];
  const pairGaps: Array<{ c: string; gap: number }> = [];
  for (const bucket of coreSides.values()) {
    if (!bucket.a || !bucket.b) continue;
    const gap = Math.abs(bucket.a.m - bucket.b.m);
    if (gap > 0.4) pairGaps.push({ c: bucket.a.construct, gap });
  }
  pairGaps.sort((a, b) => b.gap - a.gap);
  for (const g of pairGaps) reasonCodes.push(`RC_PAIR_GAP_${g.c}`);
  const low = CONSTRUCTS
    .map((c) => ({ c, th: thetaP[c], mu: params.cons[c]?.mu ?? 0.5 }))
    .sort((a, b) => a.th - b.th)
    .slice(0, 2)
    .filter((row) => row.th < row.mu - 0.1);
  for (const row of low) reasonCodes.push(`RC_LOW_${row.c}`);
  if (S3 >= 0.5) reasonCodes.push("RC_IM");
  if (S4 >= 0.5) reasonCodes.push("RC_CHOICE_GAP");
  if (S2 >= 0.5) reasonCodes.push("RC_ATTENTION");
  if (S5 >= 0.5) reasonCodes.push("RC_STYLE");
  if (S6 >= 0.5) reasonCodes.push("RC_SPEED");
  if (flags.includes("PRESENT-BIAS")) reasonCodes.push("RC_PRESENT_BIAS");

  let recommendation = recommend(band, viBand);
  if (flags.includes("RETEST")) recommendation = "RETEST";
  if (input.category === "BUN" && recommendation === "DECLINE") recommendation = "APPROVE_SMALLER";

  const constructs: Record<string, unknown> = {};
  for (const c of CONSTRUCTS) {
    constructs[c] = { en: CONSTRUCT_EN[c], r: rScore[c], theta: theta[c], thetaPrime: thetaP[c] };
  }

  const ordered = input.responses
    .map((r, i) => ({ itemId: r.itemId, optionId: r.optionId, position: r.position ?? i, followUp: Boolean(r.followUp) }))
    .sort((a, b) => a.position - b.position);
  const inputsDigest = createHash("sha256").update(canonical(ordered)).digest("hex");
  const signature = input.signKey
    ? createHmac("sha256", input.signKey)
        .update(canonical({
          sessionId: input.sessionId ?? "",
          engineVersion: ENGINE_VERSION,
          keyVersion: input.keyVersion ?? "",
          bankVersion: input.bankVersion ?? "",
          inputsDigest,
          PS,
          WI1000,
          SRI1000,
          VI,
          flags,
        }))
        .digest("hex")
    : null;

  return {
    engineVersion: ENGINE_VERSION,
    keyVersion: input.keyVersion ?? null,
    bankVersion: input.bankVersion ?? null,
    ps: PS,
    PS,
    wi1000: WI1000,
    WI1000,
    sri1000: SRI1000,
    SRI1000,
    vi: VI,
    VI,
    band,
    viBand,
    flags,
    signals,
    constructs,
    reasonCodes: reasonCodes.slice(0, 4),
    recommendation,
    inputsDigest,
    signature,
    attFail,
  };
}

function recommend(band: string, viBand: string): string {
  const table: Record<string, string> = {
    "A:High": "APPROVE",
    "A:Medium": "PROBE",
    "A:Low": "PROBE",
    "B:High": "APPROVE",
    "B:Medium": "PROBE",
    "B:Low": "PROBE",
    "C:High": "APPROVE_SMALLER",
    "C:Medium": "COMMITTEE",
    "C:Low": "COMMITTEE",
    "D:High": "DECLINE",
    "D:Medium": "RETEST",
    "D:Low": "RETEST",
  };
  return table[`${band}:${viBand}`] ?? "COMMITTEE";
}

export function selectFollowUps(input: {
  core: Array<{ item: ItemMeta; key: MarkPayload; optionId: string }>;
  followUps: Array<{ item: ItemMeta; key: MarkPayload }>;
  rngSeed: number;
}): string[] {
  const byC: Record<string, number[]> = {};
  const disc: Record<string, number> = {};
  const pairMarks = new Map<string, { a?: number; b?: number; c?: string }>();
  for (const row of input.core) {
    if (row.item.role !== "SCORED" || !row.item.construct) continue;
    const m = row.key.marks?.[row.optionId];
    if (m == null) continue;
    (byC[row.item.construct] ??= []).push(m);
    if (row.item.pair && row.item.side) {
      const bucket = pairMarks.get(row.item.pair) ?? {};
      bucket[row.item.side === "b" ? "b" : "a"] = m;
      bucket.c = row.item.construct;
      pairMarks.set(row.item.pair, bucket);
    }
  }
  for (const bucket of pairMarks.values()) {
    if (bucket.a == null || bucket.b == null || !bucket.c) continue;
    const gap = Math.abs(bucket.a - bucket.b);
    disc[bucket.c] = Math.max(disc[bucket.c] ?? 0, gap);
  }
  const s: Record<string, number> = {};
  for (const c of CONSTRUCTS) {
    const xs = byC[c];
    s[c] = xs?.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5;
    disc[c] = disc[c] ?? 0;
  }
  const ranked = CONSTRUCTS.slice().sort((a, b) => {
    if (disc[b] !== disc[a]) return disc[b] - disc[a];
    return s[b] - s[a];
  });
  const rng = mulberry32(input.rngSeed);
  const chosen: string[] = [];
  const used = new Set<string>();
  for (const c of ranked) {
    if (chosen.length >= 4) break;
    const pool = input.followUps.filter((f) => f.item.role === "SCORED" && f.item.construct === c && !used.has(f.item.id));
    pool.sort((a, b) => {
      const da = a.key.dir ?? 1;
      const db = b.key.dir ?? 1;
      return s[c] >= 0.6 ? da - db : db - da;
    });
    if (!pool.length) continue;
    const pick = pool[Math.floor(rng() * Math.min(2, pool.length))];
    chosen.push(pick.item.id);
    used.add(pick.item.id);
  }
  if (chosen.length < 4) {
    for (const f of input.followUps) {
      if (chosen.length >= 4) break;
      if (f.item.role === "SCORED" && !used.has(f.item.id)) {
        chosen.push(f.item.id);
        used.add(f.item.id);
      }
    }
  }
  const validity = input.followUps.filter((f) => f.item.role === "ATT" || f.item.role === "VIR" || f.item.role === "ADM");
  if (!validity.length) throw new Error("selectFollowUps: no validity follow-ups");
  chosen.push(validity[Math.floor(rng() * validity.length)].item.id);
  if (chosen.length !== 5) throw new Error(`selectFollowUps: got ${chosen.length}`);
  return chosen;
}

/** Deterministic core of §11.2. Exposure, enemies, and canaries stay in the service. */
export function assembleForm(input: {
  sets: string[][];
  seed: number;
  secondsById?: Record<string, number>;
  target?: number;
  tolSeconds?: number;
}): string[] {
  if (input.sets.length !== 15 || input.sets.some((s) => s.length !== 40)) {
    throw new Error("assembleForm: need 15 sets of 40 items in slot order");
  }
  const rng = mulberry32(input.seed);
  const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const timed = input.secondsById && input.target != null && input.tolSeconds != null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const pairSet: Record<string, number> = {};
    const form: string[] = [];
    for (let qi = 0; qi < 40; qi++) {
      const pair = SLOT_PAIR[qi];
      let setIndex: number;
      if (pair) {
        if (pairSet[pair] == null) pairSet[pair] = randInt(0, 14);
        setIndex = pairSet[pair];
      } else {
        setIndex = randInt(0, 14);
      }
      form.push(input.sets[setIndex][qi]);
    }
    if (!timed) return form;
    const total = form.reduce((sum, id) => sum + (input.secondsById![id] ?? 0), 0);
    if (Math.abs(total - input.target!) <= input.tolSeconds!) return form;
  }
  throw new Error(`assembleForm: no form within ±${input.tolSeconds}s of target ${input.target}`);
}
