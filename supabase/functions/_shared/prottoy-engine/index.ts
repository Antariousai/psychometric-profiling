/**
 * PROTTOY engine — Edge shared module.
 *
 * Scoring lives in ./engine.ts (same text as prottoy-pack/reference/engine.ts).
 * scoreSession still refuses to invent marks when the caller has not loaded
 * the restricted key payload from the database.
 */
import {
  ENGINE_VERSION as PACK_ENGINE_VERSION,
  assembleForm,
  hashSeed,
  score,
  selectFollowUps,
  type ItemMeta,
  type MarkPayload,
  type ResponseIn,
  type ScoreParams,
} from './engine.ts';

export const ENGINE_VERSION = PACK_ENGINE_VERSION;
export { assembleForm, hashSeed, score, selectFollowUps };
export const isEngineStub = false;

export class EnginePackMissingError extends Error {
  constructor(op: string) {
    super(
      `PROTTOY engine: cannot ${op}. Load prottoy_param_sets and prottoy_mark_entries ` +
        `(service role) and pass them in. Do not invent marks.`,
    );
    this.name = 'EnginePackMissingError';
  }
}

/** Strip catalog item for field packet — text only, no constructs/roles/marks. */
export function stripItemForField(item: {
  id: string;
  format: string;
  natural_order?: boolean;
  naturalOrder?: boolean;
  stem_bn?: string;
  stem_en?: string;
  stem?: { bn?: string; en?: string };
  options?: Array<{ id: string; text_bn?: string; text_en?: string; bn?: string; en?: string; position?: number }>;
}) {
  const stemBn = item.stem_bn ?? item.stem?.bn ?? '';
  const stemEn = item.stem_en ?? item.stem?.en ?? undefined;
  const options = (item.options || [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((o) => ({
      optionRef: o.id,
      bn: o.text_bn ?? o.bn ?? '',
      en: o.text_en ?? o.en,
    }));
  return {
    itemRef: item.id,
    format: item.format,
    naturalOrder: item.natural_order ?? item.naturalOrder ?? true,
    stem: { bn: stemBn, en: stemEn },
    options,
  };
}

/**
 * Assemble 40 core items for a category.
 * Stub: picks first LIVE set's 40 items for the category (deterministic by set_no).
 * Real engine uses exposure + timing (±10s) from reference/engine.ts.
 */
export function assembleFormStub(
  items: Array<Record<string, unknown>>,
  category: string,
  _seed?: string,
): string[] {
  const core = items
    .filter((i) => i.category === category && !i.is_followup)
    .sort((a, b) => {
      const sa = Number(a.set_no ?? 0) - Number(b.set_no ?? 0);
      if (sa !== 0) return sa;
      return Number(a.q ?? 0) - Number(b.q ?? 0);
    });
  const firstSet = core[0]?.set_no;
  const setItems = core.filter((i) => i.set_no === firstSet).slice(0, 40);
  if (setItems.length < 40) {
    throw new Error(
      `assembleFormStub: category ${category} has ${setItems.length} core items in set ${firstSet}; need 40. Import item bank.`,
    );
  }
  return setItems.map((i) => String(i.id));
}

/**
 * Select 5 follow-ups. Stub: first 5 follow-up IDs for category (not psychometrically valid).
 * Real selector requires marks + golden vectors — throws if caller requests scored selection.
 */
export function selectFollowupsStub(
  followupItems: Array<Record<string, unknown>>,
  category: string,
  _coreResponses?: unknown[],
): string[] {
  const ids = followupItems
    .filter((i) => i.category === category && i.is_followup)
    .map((i) => String(i.id))
    .slice(0, 5);
  if (ids.length < 5) {
    throw new Error(
      `selectFollowupsStub: category ${category} has ${ids.length} follow-ups; need 5. Import item bank.`,
    );
  }
  return ids;
}

/**
 * Score a session from already-loaded keys. Throws if marks were not loaded.
 * Never invents PS/WI/SRI/VI.
 */
export function scoreSession(input: {
  sessionId?: string;
  category: string;
  responses: ResponseIn[];
  bankVersion?: string | null;
  bankVersionId?: string | null;
  keyVersion?: string | null;
  keyVersionId?: string | null;
  params?: ScoreParams;
  items?: Record<string, ItemMeta>;
  keys?: Record<string, MarkPayload>;
  signKey?: string;
}) {
  if (!input.params || !input.items || !input.keys) {
    throw new EnginePackMissingError('scoreSession');
  }
  return score({
    category: input.category,
    params: input.params,
    items: input.items,
    keys: input.keys,
    responses: input.responses,
    sessionId: input.sessionId,
    keyVersion: input.keyVersion ?? input.keyVersionId ?? undefined,
    bankVersion: input.bankVersion ?? input.bankVersionId ?? undefined,
    signKey: input.signKey,
  });
}
