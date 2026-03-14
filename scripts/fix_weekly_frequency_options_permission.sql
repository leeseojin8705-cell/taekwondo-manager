-- weekly_frequency_label 이 계속 null 일 때
-- weekly_frequency_options 테이블 읽기 권한만 다시 적용 (Supabase SQL Editor에서 실행)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_frequency_options') THEN
    EXECUTE 'GRANT SELECT ON public.weekly_frequency_options TO anon, authenticated, service_role';
    ALTER TABLE public.weekly_frequency_options ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read weekly_frequency_options" ON public.weekly_frequency_options;
    CREATE POLICY "Allow read weekly_frequency_options" ON public.weekly_frequency_options FOR SELECT TO anon, authenticated, service_role USING (true);
    RAISE NOTICE 'weekly_frequency_options: GRANT + RLS applied.';
  ELSE
    RAISE NOTICE 'Table weekly_frequency_options not found.';
  END IF;
END $$;

-- 확인: 데이터 있는지 (선택)
-- SELECT id, name FROM public.weekly_frequency_options LIMIT 5;
