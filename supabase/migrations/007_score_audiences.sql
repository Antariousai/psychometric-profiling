-- Branch managers read the overall score. Calculation detail is a separate
-- table so a manager JWT cannot select signals, constructs, or the signature.
-- New signups cannot choose their own role.

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
    'FIELD_OFFICER'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_staff_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_profiles_protect_role ON public.staff_profiles;
CREATE TRIGGER staff_profiles_protect_role
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_staff_role();

CREATE TABLE IF NOT EXISTS public.prottoy_score_detail (
  session_id uuid PRIMARY KEY REFERENCES public.prottoy_scores (session_id) ON DELETE CASCADE,
  signals jsonb NOT NULL DEFAULT '{}',
  constructs jsonb NOT NULL DEFAULT '{}',
  inputs_digest text,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prottoy_score_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prottoy_score_detail_select_antarious ON public.prottoy_score_detail;
CREATE POLICY prottoy_score_detail_select_antarious
  ON public.prottoy_score_detail
  FOR SELECT TO authenticated
  USING (public.staff_role() IN ('PSYCHOMETRICIAN', 'SYS_ADMIN'));

DROP POLICY IF EXISTS prottoy_score_detail_deny_insert ON public.prottoy_score_detail;
CREATE POLICY prottoy_score_detail_deny_insert
  ON public.prottoy_score_detail
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_score_detail_deny_update ON public.prottoy_score_detail;
CREATE POLICY prottoy_score_detail_deny_update
  ON public.prottoy_score_detail
  FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS prottoy_score_detail_deny_delete ON public.prottoy_score_detail;
CREATE POLICY prottoy_score_detail_deny_delete
  ON public.prottoy_score_detail
  FOR DELETE TO authenticated, anon
  USING (false);

INSERT INTO public.prottoy_score_detail (session_id, signals, constructs, inputs_digest, signature)
SELECT session_id, signals, constructs, inputs_digest, signature
FROM public.prottoy_scores
ON CONFLICT (session_id) DO NOTHING;

ALTER TABLE public.prottoy_scores
  DROP COLUMN IF EXISTS signals,
  DROP COLUMN IF EXISTS constructs,
  DROP COLUMN IF EXISTS inputs_digest,
  DROP COLUMN IF EXISTS signature;
