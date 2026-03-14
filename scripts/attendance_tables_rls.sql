-- Check-in / Attendance: allow read and write for anon, authenticated.
-- Run in Supabase if Check-in Home or Attendance Log fails to load.
-- Tables must exist (attendance_logs, daily_checkin_status, checkin_settings).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_logs') THEN
    ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read attendance_logs" ON public.attendance_logs;
    DROP POLICY IF EXISTS "Allow insert attendance_logs" ON public.attendance_logs;
    CREATE POLICY "Allow read attendance_logs" ON public.attendance_logs FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert attendance_logs" ON public.attendance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
    GRANT SELECT, INSERT ON public.attendance_logs TO anon, authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_checkin_status') THEN
    ALTER TABLE public.daily_checkin_status ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read daily_checkin_status" ON public.daily_checkin_status;
    DROP POLICY IF EXISTS "Allow insert daily_checkin_status" ON public.daily_checkin_status;
    DROP POLICY IF EXISTS "Allow update daily_checkin_status" ON public.daily_checkin_status;
    CREATE POLICY "Allow read daily_checkin_status" ON public.daily_checkin_status FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert daily_checkin_status" ON public.daily_checkin_status FOR INSERT TO anon, authenticated WITH CHECK (true);
    CREATE POLICY "Allow update daily_checkin_status" ON public.daily_checkin_status FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON public.daily_checkin_status TO anon, authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checkin_settings') THEN
    ALTER TABLE public.checkin_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read checkin_settings" ON public.checkin_settings;
    DROP POLICY IF EXISTS "Allow update checkin_settings" ON public.checkin_settings;
    CREATE POLICY "Allow read checkin_settings" ON public.checkin_settings FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow update checkin_settings" ON public.checkin_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, UPDATE ON public.checkin_settings TO anon, authenticated;
  END IF;
END $$;
