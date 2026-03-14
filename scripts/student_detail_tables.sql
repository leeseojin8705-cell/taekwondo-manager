-- Student Detail 페이지 로드 시 400/401 방지
-- Supabase SQL Editor에서 이 파일 전체 실행 (한 번만)

-- 1) student_contracts에 auto_renew 컬럼 추가 (없을 때만)
ALTER TABLE public.student_contracts
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;

-- 2) student_notes: created_at 보장 + RLS + 읽기 허용 (테이블 있을 때만)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_notes') THEN
    ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_notes')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_notes', r.policyname); END LOOP;
    CREATE POLICY "Allow read student_notes" ON public.student_notes FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.student_notes TO anon, authenticated;
  END IF;
END $$;

-- 3) student_documents: created_at 보장 + RLS + 읽기 허용 (401 해결)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_documents') THEN
    ALTER TABLE public.student_documents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_documents')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_documents', r.policyname); END LOOP;
    CREATE POLICY "Allow read student_documents" ON public.student_documents FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.student_documents TO anon, authenticated;
  END IF;
END $$;

-- 4) student_hold_logs: created_at 보장 + RLS + 읽기 허용
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_hold_logs') THEN
    ALTER TABLE public.student_hold_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.student_hold_logs ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_hold_logs')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_hold_logs', r.policyname); END LOOP;
    CREATE POLICY "Allow read student_hold_logs" ON public.student_hold_logs FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.student_hold_logs TO anon, authenticated;
  END IF;
END $$;

-- 5) payments: RLS + 읽기 허용 (dashboard와 동일)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', r.policyname); END LOOP;
    CREATE POLICY "Allow read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.payments TO anon, authenticated;
  END IF;
END $$;

-- 6) invoices: RLS + 읽기 허용
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', r.policyname); END LOOP;
    CREATE POLICY "Allow read invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.invoices TO anon, authenticated;
  END IF;
END $$;
