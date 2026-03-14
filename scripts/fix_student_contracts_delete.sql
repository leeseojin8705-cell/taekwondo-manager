-- Allow deleting student_contracts (e.g. remove contract from student detail page).
-- Run in Supabase SQL Editor if contract delete fails with permission error.

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete student_contracts" ON public.student_contracts;
CREATE POLICY "Allow delete student_contracts" ON public.student_contracts
  FOR DELETE TO anon, authenticated, service_role USING (true);
GRANT DELETE ON public.student_contracts TO anon, authenticated, service_role;
