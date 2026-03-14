-- Allow updating student_contracts (e.g. End contract from student detail page).
-- Run in Supabase SQL Editor if "End contract" fails with permission error.

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow update student_contracts" ON public.student_contracts;
CREATE POLICY "Allow update student_contracts" ON public.student_contracts
  FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);
GRANT UPDATE ON public.student_contracts TO anon, authenticated, service_role;
