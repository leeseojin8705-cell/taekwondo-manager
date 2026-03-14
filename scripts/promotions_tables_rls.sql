-- 승급(Promotions) 코너: testing_events, testing_event_students, promotion_histories 읽기/쓰기 허용
-- Supabase SQL Editor에서 이 파일 전체 실행 (한 번만)

DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testing_events') THEN
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS testing_type_id uuid;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.testing_events ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'testing_events')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.testing_events', r.policyname); END LOOP;
    CREATE POLICY "Allow read testing_events" ON public.testing_events FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert testing_events" ON public.testing_events FOR INSERT TO anon, authenticated WITH CHECK (true);
    CREATE POLICY "Allow update testing_events" ON public.testing_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON public.testing_events TO anon, authenticated;
  END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testing_event_students') THEN
    ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.testing_event_students ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'testing_event_students')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.testing_event_students', r.policyname); END LOOP;
    CREATE POLICY "Allow read testing_event_students" ON public.testing_event_students FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert testing_event_students" ON public.testing_event_students FOR INSERT TO anon, authenticated WITH CHECK (true);
    CREATE POLICY "Allow update testing_event_students" ON public.testing_event_students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON public.testing_event_students TO anon, authenticated;
  END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'promotion_histories') THEN
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS promoted_at timestamptz;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.promotion_histories ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotion_histories')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.promotion_histories', r.policyname); END LOOP;
    CREATE POLICY "Allow read promotion_histories" ON public.promotion_histories FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert promotion_histories" ON public.promotion_histories FOR INSERT TO anon, authenticated WITH CHECK (true);
    CREATE POLICY "Allow update promotion_histories" ON public.promotion_histories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON public.promotion_histories TO anon, authenticated;
  END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testing_types') THEN
    ALTER TABLE public.testing_types ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'testing_types')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.testing_types', r.policyname); END LOOP;
    CREATE POLICY "Allow read testing_types" ON public.testing_types FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.testing_types TO anon, authenticated;
  END IF;
END $$;
