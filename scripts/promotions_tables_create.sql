-- 승급 코너용 테이블 생성 (testing_events, testing_event_students, promotion_histories)
-- students, belts 테이블이 있어야 합니다. Supabase SQL Editor에서 전체 실행.

CREATE TABLE IF NOT EXISTS public.testing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  testing_date date,
  location text,
  status text,
  testing_fee numeric(10,2) DEFAULT 0,
  notes text,
  testing_type_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.testing_event_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testing_event_id uuid NOT NULL REFERENCES public.testing_events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  result_status text,
  created_at timestamptz DEFAULT now()
);

-- 이미 테이블이 있었을 때 누락 컬럼 추가
ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS testing_type_id uuid;
ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS student_id uuid;
ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_testing_event_students_event ON public.testing_event_students(testing_event_id);
CREATE INDEX IF NOT EXISTS idx_testing_event_students_student ON public.testing_event_students(student_id);

-- promotion_histories
CREATE TABLE IF NOT EXISTS public.promotion_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  testing_event_id uuid REFERENCES public.testing_events(id) ON DELETE SET NULL,
  from_belt_id uuid,
  to_belt_id uuid,
  promoted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 이미 테이블이 다른 구조로 있었을 때 누락 컬럼 추가
ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS promoted_at timestamptz;
ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_promotion_histories_student ON public.promotion_histories(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_histories_event ON public.promotion_histories(testing_event_id);
CREATE INDEX IF NOT EXISTS idx_promotion_histories_promoted ON public.promotion_histories(promoted_at);

-- RLS 적용 (이 파일 실행 후 promotions_tables_rls.sql 없이 여기서 바로 적용 가능)
DO $$
DECLARE r RECORD;
BEGIN
  ALTER TABLE public.testing_events ENABLE ROW LEVEL SECURITY;
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'testing_events')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.testing_events', r.policyname); END LOOP;
  CREATE POLICY "Allow read testing_events" ON public.testing_events FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "Allow insert testing_events" ON public.testing_events FOR INSERT TO anon, authenticated WITH CHECK (true);
  CREATE POLICY "Allow update testing_events" ON public.testing_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE ON public.testing_events TO anon, authenticated;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  ALTER TABLE public.testing_event_students ENABLE ROW LEVEL SECURITY;
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'testing_event_students')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.testing_event_students', r.policyname); END LOOP;
  CREATE POLICY "Allow read testing_event_students" ON public.testing_event_students FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "Allow insert testing_event_students" ON public.testing_event_students FOR INSERT TO anon, authenticated WITH CHECK (true);
  CREATE POLICY "Allow update testing_event_students" ON public.testing_event_students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow delete testing_event_students" ON public.testing_event_students FOR DELETE TO anon, authenticated USING (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.testing_event_students TO anon, authenticated;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  ALTER TABLE public.promotion_histories ENABLE ROW LEVEL SECURITY;
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotion_histories')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.promotion_histories', r.policyname); END LOOP;
  CREATE POLICY "Allow read promotion_histories" ON public.promotion_histories FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "Allow insert promotion_histories" ON public.promotion_histories FOR INSERT TO anon, authenticated WITH CHECK (true);
  CREATE POLICY "Allow update promotion_histories" ON public.promotion_histories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE ON public.promotion_histories TO anon, authenticated;
END $$;
