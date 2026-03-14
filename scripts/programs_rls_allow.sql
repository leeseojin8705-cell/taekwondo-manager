-- Fix: "new row violates row-level security policy for table programs"
-- Run this in Supabase SQL Editor so the Pricing Plan page can create and manage programs.

-- Option A: Allow all operations for authenticated users (recommended)
DROP POLICY IF EXISTS "Allow authenticated all on programs" ON public.programs;
CREATE POLICY "Allow authenticated all on programs"
  ON public.programs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Option B: If your app uses anon key (e.g. public form), also allow anon (uncomment if needed):
-- DROP POLICY IF EXISTS "Allow anon all on programs" ON public.programs;
-- CREATE POLICY "Allow anon all on programs"
--   ON public.programs
--   FOR ALL
--   TO anon
--   USING (true)
--   WITH CHECK (true);

-- Grant usage so the role can access the table
GRANT ALL ON public.programs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
