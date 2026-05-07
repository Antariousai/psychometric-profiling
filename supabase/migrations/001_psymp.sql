-- Psychometric questions (full JSON payload mirrors app shape in data/questions.js)
CREATE TABLE IF NOT EXISTS public.psychometric_questions (
  id text PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions (id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES public.psychometric_questions (id) ON DELETE RESTRICT,
  value int NOT NULL,
  response_ms int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS assessment_responses_session_id_idx ON public.assessment_responses (session_id);

ALTER TABLE public.psychometric_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- Anon (mobile app) policies — tighten when you add Supabase Auth.
CREATE POLICY psychometric_questions_select_anon
  ON public.psychometric_questions FOR SELECT
  USING (true);

CREATE POLICY assessment_sessions_insert_anon
  ON public.assessment_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY assessment_sessions_update_anon
  ON public.assessment_sessions FOR UPDATE
  USING (true);

CREATE POLICY assessment_responses_select_anon
  ON public.assessment_responses FOR SELECT
  USING (true);

CREATE POLICY assessment_responses_insert_anon
  ON public.assessment_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY assessment_responses_update_anon
  ON public.assessment_responses FOR UPDATE
  USING (true)
  WITH CHECK (true);
