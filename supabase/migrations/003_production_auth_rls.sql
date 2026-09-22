-- =============================================================================
-- Production-oriented RLS, staff_profiles, audit (created_by) + catalog read
-- Replaces permissive anon write policies from 001_psymp + 002_full_domain.
-- -----------------------------------------------------------------------------
-- Prerequisites: Enable Phone (or Email) Auth in Supabase.
-- JWT role "authenticated" is used for officers; anon may only read catalogs.
-- Service role / Edge Functions bypass RLS when writing authoritative results.
-- =============================================================================

-- ── Staff profile (mirror of auth.users) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'loan_officer',
  officer_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_staff_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.phone,
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'loan_officer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_staff_auth_signup ON auth.users;
CREATE TRIGGER on_staff_auth_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_staff_signup();

DROP TRIGGER IF EXISTS staff_profiles_updated ON public.staff_profiles;
CREATE TRIGGER staff_profiles_updated
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP POLICY IF EXISTS staff_profiles_self_select ON public.staff_profiles;
CREATE POLICY staff_profiles_self_select
  ON public.staff_profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS staff_profiles_self_update ON public.staff_profiles;
CREATE POLICY staff_profiles_self_update
  ON public.staff_profiles FOR UPDATE TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── Audit columns (ownership) ─────────────────────────────────────────────
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

ALTER TABLE public.credit_decisions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

CREATE INDEX IF NOT EXISTS applicants_created_by_idx ON public.applicants (created_by);
CREATE INDEX IF NOT EXISTS assessment_sessions_created_by_idx ON public.assessment_sessions (created_by);
CREATE INDEX IF NOT EXISTS credit_decisions_created_by_idx ON public.credit_decisions (created_by);

CREATE OR REPLACE FUNCTION public.stamp_staff_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS applicants_stamp_creator ON public.applicants;
CREATE TRIGGER applicants_stamp_creator
  BEFORE INSERT ON public.applicants
  FOR EACH ROW EXECUTE PROCEDURE public.stamp_staff_created_by();

DROP TRIGGER IF EXISTS assessment_sessions_stamp_creator ON public.assessment_sessions;
CREATE TRIGGER assessment_sessions_stamp_creator
  BEFORE INSERT ON public.assessment_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.stamp_staff_created_by();

DROP TRIGGER IF EXISTS credit_decisions_stamp_creator ON public.credit_decisions;
CREATE TRIGGER credit_decisions_stamp_creator
  BEFORE INSERT ON public.credit_decisions
  FOR EACH ROW EXECUTE PROCEDURE public.stamp_staff_created_by();

-- ── Drop legacy permissive policies (anon write) ────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'psychometric_questions',
        'psychometric_dimensions',
        'applicants',
        'assessment_sessions',
        'assessment_responses',
        'psychometric_assessment_results',
        'credit_decisions'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);


  END LOOP;
END $$;

-- ── Catalog read (questions + dimensions) ─────────────────────────────────
CREATE POLICY psychometric_questions_read_all
  ON public.psychometric_questions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY psychometric_dimensions_read_all
  ON public.psychometric_dimensions FOR SELECT TO anon, authenticated USING (true);

-- ── Applicants ──────────────────────────────────────────────────────────────
CREATE POLICY applicants_select_own
  ON public.applicants FOR SELECT TO authenticated
  USING (created_by IS NOT DISTINCT FROM auth.uid());

CREATE POLICY applicants_insert_staff
  ON public.applicants FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() IS NOT NULL);

CREATE POLICY applicants_update_own
  ON public.applicants FOR UPDATE TO authenticated
  USING (created_by IS NOT DISTINCT FROM auth.uid())
  WITH CHECK (created_by IS NOT DISTINCT FROM auth.uid());

-- ── Sessions ───────────────────────────────────────────────────────────────
CREATE POLICY assessment_sessions_select_own
  ON public.assessment_sessions FOR SELECT TO authenticated
  USING (created_by IS NOT DISTINCT FROM auth.uid());

CREATE POLICY assessment_sessions_insert_staff
  ON public.assessment_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY assessment_sessions_update_own
  ON public.assessment_sessions FOR UPDATE TO authenticated
  USING (created_by IS NOT DISTINCT FROM auth.uid())
  WITH CHECK (created_by IS NOT DISTINCT FROM auth.uid());

-- ── Responses ──────────────────────────────────────────────────────────────
CREATE POLICY assessment_responses_select_via_session
  ON public.assessment_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

CREATE POLICY assessment_responses_insert_via_session
  ON public.assessment_responses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

CREATE POLICY assessment_responses_update_via_session
  ON public.assessment_responses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

-- ── Stored results: read own session; writes only via service role / Edge ──
CREATE POLICY psychometric_results_select_via_session
  ON public.psychometric_assessment_results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = psychometric_assessment_results.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

-- ── Credit decisions (officer submits from UI) ─────────────────────────────
CREATE POLICY credit_decisions_select_via_session
  ON public.credit_decisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = credit_decisions.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

CREATE POLICY credit_decisions_insert_via_session
  ON public.credit_decisions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = credit_decisions.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY credit_decisions_update_via_session
  ON public.credit_decisions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = credit_decisions.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = credit_decisions.session_id
        AND s.created_by IS NOT DISTINCT FROM auth.uid()
    )
  );

-- ── Existing auth.users without staff_profiles rows (brownfield restores) ─
INSERT INTO public.staff_profiles (id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.id = u.id)
ON CONFLICT (id) DO NOTHING;
