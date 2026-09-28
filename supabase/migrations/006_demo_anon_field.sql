-- Demo field path (EXPO_PUBLIC_REQUIRE_AUTH is not true).
-- The browser uses the anon key and has no staff user. Allow writes only on
-- rows that were not created by a signed-in officer (created_by is null).

DROP POLICY IF EXISTS assessment_sessions_insert_anon_demo ON public.assessment_sessions;
CREATE POLICY assessment_sessions_insert_anon_demo
  ON public.assessment_sessions FOR INSERT TO anon
  WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS assessment_sessions_select_anon_demo ON public.assessment_sessions;
CREATE POLICY assessment_sessions_select_anon_demo
  ON public.assessment_sessions FOR SELECT TO anon
  USING (created_by IS NULL);

DROP POLICY IF EXISTS assessment_sessions_update_anon_demo ON public.assessment_sessions;
CREATE POLICY assessment_sessions_update_anon_demo
  ON public.assessment_sessions FOR UPDATE TO anon
  USING (created_by IS NULL)
  WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS assessment_responses_insert_anon_demo ON public.assessment_responses;
CREATE POLICY assessment_responses_insert_anon_demo
  ON public.assessment_responses FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NULL
    )
  );

DROP POLICY IF EXISTS assessment_responses_update_anon_demo ON public.assessment_responses;
CREATE POLICY assessment_responses_update_anon_demo
  ON public.assessment_responses FOR UPDATE TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = assessment_responses.session_id
        AND s.created_by IS NULL
    )
  );

DROP POLICY IF EXISTS applicants_select_anon_demo ON public.applicants;
CREATE POLICY applicants_select_anon_demo
  ON public.applicants FOR SELECT TO anon
  USING (created_by IS NULL);

DROP POLICY IF EXISTS applicants_insert_anon_demo ON public.applicants;
CREATE POLICY applicants_insert_anon_demo
  ON public.applicants FOR INSERT TO anon
  WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS applicants_update_anon_demo ON public.applicants;
CREATE POLICY applicants_update_anon_demo
  ON public.applicants FOR UPDATE TO anon
  USING (created_by IS NULL)
  WITH CHECK (created_by IS NULL);
