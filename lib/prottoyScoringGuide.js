/** Public description of PROTTOY-1000. Item marks and fitted weights are not included. */

export const ENGINE_VERSION = 'prottoy-1000-s12-1';

export const FORMULA_STEPS = [
  {
    id: 'r',
    title: 'Item mark → construct score r',
    body: 'Each chosen option has a mark in the server-side key. For construct c, r is the weight-adjusted mean of those marks. If the form has no scored items for c, r falls back to that construct’s prior mean μ.',
  },
  {
    id: 'theta',
    title: 'Logistic trait θ',
    body: 'θ_c = 1 / (1 + exp(−α_c × (r_c − β_c))). α and β are per-construct parameters stored with the key, not in the app.',
  },
  {
    id: 'vi',
    title: 'Validity index VI',
    body: 'Six response-quality signals S1–S6 are scaled to 0–1 and combined: VI = 1 − min(1, Σ v_k × S_k). VI near 1 means the answers look consistent. VI near 0 down-weights the traits toward the prior.',
  },
  {
    id: 'thetaP',
    title: 'Doubt-adjusted trait θ′',
    body: 'μ′ = μ × (1 − doubt × (1 − VI)). Then θ′_c = μ′ + VI × (θ_c − μ′). Low validity pulls the trait back toward the prior mean.',
  },
  {
    id: 'indexes',
    title: 'WI, SRI, and the overall score',
    body: 'WI = Σ λW_c × θ′_c over the willingness constructs. SRI = Σ λS_c × θ′_c over the repayment constructs. G = WI^π × SRI^(1−π). PS = round(1000 × G). Two or more failed attention checks cap G and force a retest flag.',
  },
];

export const SIGNALS = [
  { id: 'S1', name: 'Inconsistency', detail: 'Pair disagreement (PDI) blended with follow-up twin distance.' },
  { id: 'S2', name: 'Attention', detail: 'Failed attention checks. Two failures cap the score and flag RETEST.' },
  { id: 'S3', name: 'Impression management', detail: 'Share of socially desirable answers above the threshold.' },
  { id: 'S4', name: 'Choice gap', detail: 'Forced-choice grade versus the keyed choice pattern.' },
  { id: 'S5', name: 'Response style', detail: 'How often the first option is picked.' },
  { id: 'S6', name: 'Speed', detail: 'Share of answers that are fast for that item format.' },
];

export const CONSTRUCTS = [
  { id: 'C1', en: 'Integrity', index: 'WI' },
  { id: 'C2', en: 'Obligation & promise-keeping', index: 'WI' },
  { id: 'C3', en: 'Locus of control', index: 'WI + SRI' },
  { id: 'C4', en: 'Social accountability', index: 'WI' },
  { id: 'C5', en: 'Default rationalisation', index: 'WI' },
  { id: 'C6', en: 'Self-control', index: 'SRI' },
  { id: 'C7', en: 'Money attitudes', index: 'SRI' },
  { id: 'C8', en: 'Patience', index: 'SRI' },
  { id: 'C9', en: 'Lure & risk susceptibility', index: 'SRI' },
  { id: 'C10', en: 'Resilience & coping', index: 'SRI' },
  { id: 'C11', en: 'Debt attitude', index: 'WI + SRI' },
];

export const BANDS = [
  { band: 'A', rule: 'PS ≥ 700' },
  { band: 'B', rule: 'PS ≥ 580' },
  { band: 'C', rule: 'PS ≥ 460' },
  { band: 'D', rule: 'PS below 460' },
];

export const VI_BANDS = [
  { band: 'High', rule: 'VI ≥ 0.70' },
  { band: 'Medium', rule: 'VI ≥ 0.50' },
  { band: 'Low', rule: 'VI below 0.50' },
];

export const RECOMMENDATIONS = [
  ['A', 'High', 'APPROVE'],
  ['A', 'Medium', 'PROBE'],
  ['A', 'Low', 'PROBE'],
  ['B', 'High', 'APPROVE'],
  ['B', 'Medium', 'PROBE'],
  ['B', 'Low', 'PROBE'],
  ['C', 'High', 'APPROVE_SMALLER'],
  ['C', 'Medium', 'COMMITTEE'],
  ['C', 'Low', 'COMMITTEE'],
  ['D', 'High', 'DECLINE'],
  ['D', 'Medium', 'RETEST'],
  ['D', 'Low', 'RETEST'],
];
