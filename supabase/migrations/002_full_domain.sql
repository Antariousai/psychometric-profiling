-- =============================================================================
-- PSYMP full domain schema (adds to 001_psymp.sql)
-- -----------------------------------------------------------------------------
-- Entity overview:
--
--   psychometric_dimensions   Static: 7 scoring axes (maps question.dim → UI)
--   psychometric_questions    Full question definitions (payload JSON = app shape)
--   applicants               Member/applicant master (profile JSON + slug for app)
--   assessment_sessions      One run of the questionnaire for one applicant
--   assessment_responses     Per-question answer + timing (unique per session+q)
--   psychometric_assessment_results   Optional snapshot after scoring (computeScore)
--   credit_decisions         Officer outcome from result screen (approve/decline/flag)
--
--   Future: link assessment_sessions.officer_id → auth.users when you add Supabase Auth.
-- =============================================================================

-- ── Dimensions (replace bundled data/dimensions.js when seeded) ────────────
CREATE TABLE IF NOT EXISTS public.psychometric_dimensions (
  id text PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0,
  bn text NOT NULL,
  en text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psychometric_dimensions_sort_idx
  ON public.psychometric_dimensions (sort_order);

-- ── Applicants / members (replaces demo personas in DB-backed mode) ─────────
CREATE TABLE IF NOT EXISTS public.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  profile jsonb NOT NULL DEFAULT '{}',
  phone text,
  nid_masked text,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applicants_slug_idx ON public.applicants (slug);

-- ── Sessions: link to applicant row (uuid) + keep legacy text slug from app ─
ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS applicant_uuid uuid REFERENCES public.applicants (id) ON DELETE SET NULL;

ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS assessment_sessions_applicant_uuid_idx
  ON public.assessment_sessions (applicant_uuid);

CREATE INDEX IF NOT EXISTS assessment_sessions_created_idx
  ON public.assessment_sessions (created_at DESC);

-- ── Computed result snapshot (optional: write when leaving scoring/result) ───
CREATE TABLE IF NOT EXISTS public.psychometric_assessment_results (
  session_id uuid PRIMARY KEY REFERENCES public.assessment_sessions (id) ON DELETE CASCADE,
  applicant_uuid uuid REFERENCES public.applicants (id) ON DELETE SET NULL,
  overall int,
  rating char(1),
  risk_tier text,
  tenure_months int,
  total_pct numeric(6, 2),
  dimension_scores jsonb NOT NULL DEFAULT '[]',
  flags jsonb NOT NULL DEFAULT '[]',
  answers_snapshot jsonb,
  algorithm_version text NOT NULL DEFAULT '1',
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psychometric_results_applicant_idx
  ON public.psychometric_assessment_results (applicant_uuid);

-- ── Credit / officer decisions (from result screen) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions (id) ON DELETE CASCADE,
  applicant_uuid uuid REFERENCES public.applicants (id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN ('approved', 'declined', 'review', 'pending')),
  overall_score int,
  rating char(1),
  flag_count int NOT NULL DEFAULT 0,
  notes text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS credit_decisions_session_idx ON public.credit_decisions (session_id);
CREATE INDEX IF NOT EXISTS credit_decisions_applicant_idx ON public.credit_decisions (applicant_uuid);
CREATE INDEX IF NOT EXISTS credit_decisions_decided_idx ON public.credit_decisions (decided_at DESC);

-- ── Response row updates (idempotent upsert from client) ─────────────────────
ALTER TABLE public.assessment_responses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS psychometric_dimensions_updated ON public.psychometric_dimensions;
CREATE TRIGGER psychometric_dimensions_updated
  BEFORE UPDATE ON public.psychometric_dimensions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS applicants_updated ON public.applicants;
CREATE TRIGGER applicants_updated
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS assessment_sessions_updated ON public.assessment_sessions;
CREATE TRIGGER assessment_sessions_updated
  BEFORE UPDATE ON public.assessment_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS assessment_responses_updated ON public.assessment_responses;
CREATE TRIGGER assessment_responses_updated
  BEFORE UPDATE ON public.assessment_responses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── RLS: new tables (anon app — tighten when Auth ships) ───────────────────
ALTER TABLE public.psychometric_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychometric_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psychometric_dimensions_select_anon ON public.psychometric_dimensions;
CREATE POLICY psychometric_dimensions_select_anon
  ON public.psychometric_dimensions FOR SELECT USING (true);

DROP POLICY IF EXISTS applicants_select_anon ON public.applicants;
CREATE POLICY applicants_select_anon
  ON public.applicants FOR SELECT USING (true);

DROP POLICY IF EXISTS applicants_insert_anon ON public.applicants;
CREATE POLICY applicants_insert_anon
  ON public.applicants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS applicants_update_anon ON public.applicants;
CREATE POLICY applicants_update_anon
  ON public.applicants FOR UPDATE USING (true);

DROP POLICY IF EXISTS psychometric_results_select_anon ON public.psychometric_assessment_results;
CREATE POLICY psychometric_results_select_anon
  ON public.psychometric_assessment_results FOR SELECT USING (true);

DROP POLICY IF EXISTS psychometric_results_insert_anon ON public.psychometric_assessment_results;
CREATE POLICY psychometric_results_insert_anon
  ON public.psychometric_assessment_results FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS psychometric_results_update_anon ON public.psychometric_assessment_results;
CREATE POLICY psychometric_results_update_anon
  ON public.psychometric_assessment_results FOR UPDATE USING (true);

DROP POLICY IF EXISTS credit_decisions_select_anon ON public.credit_decisions;
CREATE POLICY credit_decisions_select_anon
  ON public.credit_decisions FOR SELECT USING (true);

DROP POLICY IF EXISTS credit_decisions_insert_anon ON public.credit_decisions;
CREATE POLICY credit_decisions_insert_anon
  ON public.credit_decisions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS credit_decisions_update_anon ON public.credit_decisions;
CREATE POLICY credit_decisions_update_anon
  ON public.credit_decisions FOR UPDATE USING (true);
