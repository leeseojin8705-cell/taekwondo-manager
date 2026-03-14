-- Dashboard: allow anon/authenticated to read payments, invoices, attendance.
-- Run in Supabase SQL Editor if Dashboard shows "Some data could not be loaded".

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.payments TO anon, authenticated;

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.invoices TO anon, authenticated;

-- attendance (if table exists and Dashboard uses it)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
    EXECUTE 'ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY';
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance', r.policyname); END LOOP;
    EXECUTE 'CREATE POLICY "Allow read attendance" ON public.attendance FOR SELECT TO anon, authenticated USING (true)';
    EXECUTE 'GRANT SELECT ON public.attendance TO anon, authenticated';
  END IF;
END $$;
