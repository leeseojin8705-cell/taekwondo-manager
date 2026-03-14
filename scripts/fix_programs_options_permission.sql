-- program_name, membership_duration_name, weekly_frequency_label 이 계속 null 일 때
-- 학생 목록 API가 programs, membership_durations, weekly_frequency_options, discount_types 를 읽을 수 있도록 권한 부여
-- Supabase SQL Editor에서 전체 실행 (Run)

-- 1) GRANT SELECT (테이블 있을 때만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programs') THEN
    EXECUTE 'GRANT SELECT ON public.programs TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'membership_durations') THEN
    EXECUTE 'GRANT SELECT ON public.membership_durations TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_frequency_options') THEN
    EXECUTE 'GRANT SELECT ON public.weekly_frequency_options TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discount_types') THEN
    EXECUTE 'GRANT SELECT ON public.discount_types TO anon, authenticated, service_role';
  END IF;
END $$;

-- 2) RLS 켜고 읽기 허용 (테이블이 있을 때만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programs') THEN
    ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read programs" ON public.programs;
    CREATE POLICY "Allow read programs" ON public.programs FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'membership_durations') THEN
    ALTER TABLE public.membership_durations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read membership_durations" ON public.membership_durations;
    CREATE POLICY "Allow read membership_durations" ON public.membership_durations FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_frequency_options') THEN
    ALTER TABLE public.weekly_frequency_options ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read weekly_frequency_options" ON public.weekly_frequency_options;
    CREATE POLICY "Allow read weekly_frequency_options" ON public.weekly_frequency_options FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discount_types') THEN
    ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read discount_types" ON public.discount_types;
    CREATE POLICY "Allow read discount_types" ON public.discount_types FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
END $$;
