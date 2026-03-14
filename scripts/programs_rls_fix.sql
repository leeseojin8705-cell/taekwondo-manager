-- ============================================================
-- "new row violates row-level security policy for table programs" 해결
-- Supabase Dashboard > SQL Editor 에서 이 스크립트 전체 실행 후, 프로그램 생성 다시 시도.
-- ============================================================

-- programs 테이블에 걸린 기존 RLS 정책 전부 제거 후, anon/authenticated 모두 허용으로 재생성
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'programs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.programs', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow authenticated all on programs"
  ON public.programs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon all on programs"
  ON public.programs FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 테이블 권한 확인
GRANT ALL ON public.programs TO authenticated, anon;
