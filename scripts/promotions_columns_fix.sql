-- 승급 테이블에 앱이 요청하는 컬럼이 없을 때 400 방지 (테이블이 이미 있을 때만 실행)
-- Supabase SQL Editor에서 실행

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testing_events') THEN
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS title text;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS testing_date date;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS location text;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS status text;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS testing_fee numeric(10,2) DEFAULT 0;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS testing_type_id uuid;
    ALTER TABLE public.testing_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testing_event_students') THEN
    ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS result_status text;
    ALTER TABLE public.testing_event_students ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'promotion_histories') THEN
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS testing_event_id uuid;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS from_belt_id uuid;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS to_belt_id uuid;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS promoted_at timestamptz;
    ALTER TABLE public.promotion_histories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
END $$;
