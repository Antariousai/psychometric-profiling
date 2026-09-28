-- =============================================================================
-- PROTTOY domain (catalog + marks + scores) on existing PSYMP schema
-- Keeps legacy psychometric_* tables. Strict score isolation via RLS.
-- =============================================================================

-- ── Staff roles: extend CHECK-free text; document SPEC Role enum values ─────
-- Existing default 'loan_officer' maps to FIELD_OFFICER for RLS helpers.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS branch_id text;

COMMENT ON COLUMN public.staff_profiles.role IS
  'FIELD_OFFICER | BRANCH_MANAGER | CREDIT_COMMITTEE | PO_ADMIN | PKSF_GOVERNANCE | PSYCHOMETRICIAN | SYS_ADMIN | loan_officer (legacy→field)';

CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT upper(replace(role, ' ', '_')) FROM public.staff_profiles WHERE id = auth.uid()),
    'FIELD_OFFICER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_score_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.staff_role() IN (
    'BRANCH_MANAGER',
    'CREDIT_COMMITTEE',
    'PO_ADMIN',
    'PKSF_GOVERNANCE',
    'PSYCHOMETRICIAN',
    'SYS_ADMIN',
    'AUDITOR'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_field_officer_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.staff_role() IN (
    'FIELD_OFFICER',
    'LOAN_OFFICER',
    'LOANOFFICER'
  )
  OR public.staff_role() NOT IN (
    'BRANCH_MANAGER',
    'CREDIT_COMMITTEE',
    'PO_ADMIN',
    'PKSF_GOVERNANCE',
    'PSYCHOMETRICIAN',
    'SYS_ADMIN',
    'AUDITOR',
    'ITEM_REVIEWER',
    'LANGUAGE_EDITOR',
    'BACKCHECK_AGENT'
  );
$$;

-- ── Catalog ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prottoy_constructs (
  id text PRIMARY KEY,                 -- C1..C11
  bn text NOT NULL,
  en text NOT NULL,
  idx text NOT NULL,                   -- WI | SRI | both
  def text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prottoy_categories (
  code text PRIMARY KEY,               -- JAG | AGR | SUF | BUN
  bn text NOT NULL,
  en text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prottoy_bank_versions (
  id text PRIMARY KEY,
  version text UNIQUE NOT NULL,
  checksum text,
  status text NOT NULL DEFAULT 'LIVE',
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prottoy_blueprint (
  bank_version_id text NOT NULL REFERENCES public.prottoy_bank_versions (id) ON DELETE CASCADE,
  q int NOT NULL,
  slot text NOT NULL,
  kind text,
  pair text,
  side text,
  construct text,
  format text,
  pair_type text,
  PRIMARY KEY (bank_version_id, q)
);

CREATE TABLE IF NOT EXISTS public.prottoy_items (
  id text PRIMARY KEY,                 -- e.g. JAG-01-Q01 or JAG-X01
  bank_version_id text NOT NULL REFERENCES public.prottoy_bank_versions (id) ON DELETE CASCADE,
  category text NOT NULL REFERENCES public.prottoy_categories (code),
  set_no int,
  slot text,
  q int,
  is_followup boolean NOT NULL DEFAULT false,
  construct text,
  role text NOT NULL,                  -- SCORED | FC | ATT | VIR | ADM
  format text NOT NULL,                -- GR | SJ | PJ | CH | FC | TF
  pair text,
  side text,
  pair_type text,
  natural_order boolean NOT NULL DEFAULT true,
  shuffle boolean NOT NULL DEFAULT false,
  stem_bn text NOT NULL,
  stem_en text,
  words int,
  est_seconds float,
  status text NOT NULL DEFAULT 'LIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prottoy_items_cat_set_q_idx
  ON public.prottoy_items (category, set_no, q);
CREATE INDEX IF NOT EXISTS prottoy_items_followup_idx
  ON public.prottoy_items (category, is_followup);

CREATE TABLE IF NOT EXISTS public.prottoy_options (
  id text PRIMARY KEY,                 -- opaque o_… or affirm/deny
  item_id text NOT NULL REFERENCES public.prottoy_items (id) ON DELETE CASCADE,
  position int NOT NULL,
  text_bn text NOT NULL,
  text_en text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prottoy_options_item_idx ON public.prottoy_options (item_id);

CREATE TABLE IF NOT EXISTS public.prottoy_followups (
  item_id text PRIMARY KEY REFERENCES public.prottoy_items (id) ON DELETE CASCADE,
  category text NOT NULL REFERENCES public.prottoy_categories (code),
  twin_of text,
  kind text,                           -- twin | VIR | ADM | ATT
  meta jsonb NOT NULL DEFAULT '{}'
);

-- ── Restricted keys (service role only) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prottoy_key_versions (
  id text PRIMARY KEY,
  version text UNIQUE NOT NULL,
  checksum text,
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prottoy_param_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_version_id text NOT NULL REFERENCES public.prottoy_key_versions (id) ON DELETE CASCADE,
  category text NOT NULL REFERENCES public.prottoy_categories (code),
  -- Pilot: JSON params stored server-side only (Vault ciphertext later).
  params jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key_version_id, category)
);

CREATE TABLE IF NOT EXISTS public.prottoy_mark_entries (
  key_version_id text NOT NULL REFERENCES public.prottoy_key_versions (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  -- Full item mark payload for that item (marks map / fc / pass / flagIf). Never expose via JWT.
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_version_id, item_id)
);

-- ── Extend assessment_sessions / responses for Prottoy path ─────────────────
ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS prottoy_category text,
  ADD COLUMN IF NOT EXISTS prottoy_status text,
  ADD COLUMN IF NOT EXISTS bank_version_id text,
  ADD COLUMN IF NOT EXISTS key_version_id text,
  ADD COLUMN IF NOT EXISTS form_item_ids jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS followup_item_ids jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS consent_accepted boolean,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS assembly_seed text;

COMMENT ON COLUMN public.assessment_sessions.prottoy_status IS
  'CREATED|CONSENTED|IN_PROGRESS|CORE_DONE|FOLLOWUPS_DONE|SUBMITTED|SCORED|ABANDONED|VOID';

-- Allow Prottoy item IDs (not in legacy psychometric_questions FK).
-- Drop FK if present so question_id can reference prottoy_items or legacy ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'assessment_responses'
      AND constraint_name = 'assessment_responses_question_id_fkey'
  ) THEN
    ALTER TABLE public.assessment_responses
      DROP CONSTRAINT assessment_responses_question_id_fkey;
  END IF;
END $$;

ALTER TABLE public.assessment_responses
  ADD COLUMN IF NOT EXISTS option_id text,
  ADD COLUMN IF NOT EXISTS is_followup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS position int,
  ADD COLUMN IF NOT EXISTS latency_ms int;

-- Prefer option_id + latency_ms for Prottoy; keep value/response_ms for legacy.

-- ── Scores (manager SELECT; field denied; writes service-role only) ─────────
CREATE TABLE IF NOT EXISTS public.prottoy_scores (
  session_id uuid PRIMARY KEY REFERENCES public.assessment_sessions (id) ON DELETE CASCADE,
  engine_version text NOT NULL,
  key_version text NOT NULL,
  bank_version text NOT NULL,
  ps int,
  wi1000 int,
  sri1000 int,
  vi double precision,
  vi_band text,
  band text,
  flags jsonb NOT NULL DEFAULT '[]',
  signals jsonb NOT NULL DEFAULT '{}',
  constructs jsonb NOT NULL DEFAULT '{}',
  reason_codes jsonb NOT NULL DEFAULT '[]',
  recommendation text,
  inputs_digest text,
  signature text,
  visible_to_decision_makers boolean NOT NULL DEFAULT true,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prottoy_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions (id) ON DELETE CASCADE,
  decider_id uuid REFERENCES auth.users (id),
  outcome text NOT NULL CHECK (outcome IN (
    'APPROVE', 'APPROVE_SMALLER', 'PROBE', 'COMMITTEE', 'RETEST', 'DECLINE'
  )),
  recommended text,
  override boolean NOT NULL DEFAULT false,
  override_reason text,
  loan_amount_bdt int,
  notes text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prottoy_decisions_session_idx ON public.prottoy_decisions (session_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS prottoy_constructs_updated ON public.prottoy_constructs;
CREATE TRIGGER prottoy_constructs_updated
  BEFORE UPDATE ON public.prottoy_constructs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS prottoy_categories_updated ON public.prottoy_categories;
CREATE TRIGGER prottoy_categories_updated
  BEFORE UPDATE ON public.prottoy_categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS prottoy_bank_versions_updated ON public.prottoy_bank_versions;
CREATE TRIGGER prottoy_bank_versions_updated
  BEFORE UPDATE ON public.prottoy_bank_versions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS prottoy_items_updated ON public.prottoy_items;
CREATE TRIGGER prottoy_items_updated
  BEFORE UPDATE ON public.prottoy_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.prottoy_constructs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_bank_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_blueprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_key_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_param_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_mark_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prottoy_decisions ENABLE ROW LEVEL SECURITY;

-- Catalog: authenticated officers may read stems/options (prefer Edge assemble).
DROP POLICY IF EXISTS prottoy_constructs_read ON public.prottoy_constructs;
CREATE POLICY prottoy_constructs_read ON public.prottoy_constructs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_categories_read ON public.prottoy_categories;
CREATE POLICY prottoy_categories_read ON public.prottoy_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_bank_versions_read ON public.prottoy_bank_versions;
CREATE POLICY prottoy_bank_versions_read ON public.prottoy_bank_versions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_blueprint_read ON public.prottoy_blueprint;
CREATE POLICY prottoy_blueprint_read ON public.prottoy_blueprint
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_items_read ON public.prottoy_items;
CREATE POLICY prottoy_items_read ON public.prottoy_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_options_read ON public.prottoy_options;
CREATE POLICY prottoy_options_read ON public.prottoy_options
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prottoy_followups_read ON public.prottoy_followups;
CREATE POLICY prottoy_followups_read ON public.prottoy_followups
  FOR SELECT TO authenticated USING (true);

-- Marks / params / key versions: DENY all JWT roles (no policies for authenticated/anon).
-- Service role bypasses RLS. Explicit deny policies for clarity:
DROP POLICY IF EXISTS prottoy_mark_entries_deny_all ON public.prottoy_mark_entries;
CREATE POLICY prottoy_mark_entries_deny_all ON public.prottoy_mark_entries
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_param_sets_deny_all ON public.prottoy_param_sets;
CREATE POLICY prottoy_param_sets_deny_all ON public.prottoy_param_sets
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_key_versions_deny_all ON public.prottoy_key_versions;
CREATE POLICY prottoy_key_versions_deny_all ON public.prottoy_key_versions
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Scores: managers SELECT; field officers denied; no INSERT/UPDATE for JWT (service role writes).
DROP POLICY IF EXISTS prottoy_scores_select_managers ON public.prottoy_scores;
CREATE POLICY prottoy_scores_select_managers ON public.prottoy_scores
  FOR SELECT TO authenticated
  USING (
    public.is_manager_score_reader()
    AND visible_to_decision_makers = true
  );

DROP POLICY IF EXISTS prottoy_scores_deny_writes ON public.prottoy_scores;
CREATE POLICY prottoy_scores_deny_writes ON public.prottoy_scores
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_scores_deny_update ON public.prottoy_scores;
CREATE POLICY prottoy_scores_deny_update ON public.prottoy_scores
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_scores_deny_delete ON public.prottoy_scores;
CREATE POLICY prottoy_scores_deny_delete ON public.prottoy_scores
  FOR DELETE TO authenticated, anon USING (false);

-- Decisions: managers read/write; field cannot see score-adjacent decision rows with scores
-- (outcome recording for managers only in pilot).
DROP POLICY IF EXISTS prottoy_decisions_select_managers ON public.prottoy_decisions;
CREATE POLICY prottoy_decisions_select_managers ON public.prottoy_decisions
  FOR SELECT TO authenticated USING (public.is_manager_score_reader());

DROP POLICY IF EXISTS prottoy_decisions_insert_managers ON public.prottoy_decisions;
CREATE POLICY prottoy_decisions_insert_managers ON public.prottoy_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_score_reader() AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS prottoy_decisions_update_managers ON public.prottoy_decisions;
CREATE POLICY prottoy_decisions_update_managers ON public.prottoy_decisions
  FOR UPDATE TO authenticated
  USING (public.is_manager_score_reader())
  WITH CHECK (public.is_manager_score_reader());

-- Seed default categories (idempotent)
INSERT INTO public.prottoy_categories (code, bn, en, description) VALUES
  ('JAG', 'জাগরণ', 'Jagoron', 'Jagoron programme'),
  ('AGR', 'আগ্রসর', 'Agrosor', 'Agrosor programme'),
  ('SUF', 'সুফলন', 'Sufolon', 'Sufolon programme'),
  ('BUN', 'বুনিয়াদ', 'Buniad', 'Buniad programme')
ON CONFLICT (code) DO NOTHING;

-- Managers need to read Prottoy sessions (not only own created_by) for decision UI.
DROP POLICY IF EXISTS assessment_sessions_select_managers_prottoy ON public.assessment_sessions;
CREATE POLICY assessment_sessions_select_managers_prottoy
  ON public.assessment_sessions FOR SELECT TO authenticated
  USING (
    public.is_manager_score_reader()
    AND prottoy_category IS NOT NULL
  );

-- Applicants readable by managers for Prottoy decision context
DROP POLICY IF EXISTS applicants_select_managers ON public.applicants;
CREATE POLICY applicants_select_managers
  ON public.applicants FOR SELECT TO authenticated
  USING (public.is_manager_score_reader());
