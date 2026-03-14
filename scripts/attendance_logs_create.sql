-- Create attendance_logs table so Check-in Home and Attendance Log work.
-- Run this in Supabase SQL Editor first; then run attendance_tables_rls.sql for RLS.

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_contract_id uuid REFERENCES public.student_contracts(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  checkin_date date NOT NULL,
  checkin_time timestamptz NOT NULL,
  checkin_source text NOT NULL,
  checkin_type text NOT NULL,
  status_at_checkin text,
  warning_flags text[],
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_checkin_date ON public.attendance_logs(checkin_date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id ON public.attendance_logs(student_id);

-- Optional: daily_checkin_status (used by kiosk/manual check-in)
CREATE TABLE IF NOT EXISTS public.daily_checkin_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  checked_in boolean NOT NULL DEFAULT true,
  attendance_log_id uuid REFERENCES public.attendance_logs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_status_date ON public.daily_checkin_status(checkin_date);

-- RLS for attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow insert attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow read attendance_logs" ON public.attendance_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert attendance_logs" ON public.attendance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT SELECT, INSERT ON public.attendance_logs TO anon, authenticated;

-- RLS for daily_checkin_status
ALTER TABLE public.daily_checkin_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read daily_checkin_status" ON public.daily_checkin_status;
DROP POLICY IF EXISTS "Allow insert daily_checkin_status" ON public.daily_checkin_status;
DROP POLICY IF EXISTS "Allow update daily_checkin_status" ON public.daily_checkin_status;
CREATE POLICY "Allow read daily_checkin_status" ON public.daily_checkin_status FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert daily_checkin_status" ON public.daily_checkin_status FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update daily_checkin_status" ON public.daily_checkin_status FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON public.daily_checkin_status TO anon, authenticated;
