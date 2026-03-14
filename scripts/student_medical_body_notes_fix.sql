-- Student medical info table: add columns used by Student Detail page.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.student_medical_body_notes
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS medications text,
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Optional but recommended: simple RLS so the app can read/write.
ALTER TABLE public.student_medical_body_notes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_medical_body_notes'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_medical_body_notes', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow read student_medical_body_notes"
  ON public.student_medical_body_notes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow write student_medical_body_notes"
  ON public.student_medical_body_notes
  FOR INSERT, UPDATE
  TO anon, authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.student_medical_body_notes TO anon, authenticated;

