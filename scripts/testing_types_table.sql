-- testing_types 테이블 생성 (PGRST205 오류 해결)
-- 승급 이벤트 등록 페이지에서 "Testing type" 드롭다운에 사용. Supabase SQL Editor에서 실행.

CREATE TABLE IF NOT EXISTS public.testing_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 기본 데이터: 벨트 시험 + 일반 행사 (둘 다 없을 때만 삽입)
INSERT INTO public.testing_types (name, sort_order)
SELECT 'Belt Test', 1
WHERE NOT EXISTS (SELECT 1 FROM public.testing_types WHERE name = 'Belt Test');

INSERT INTO public.testing_types (name, sort_order)
SELECT 'Event', 2
WHERE NOT EXISTS (SELECT 1 FROM public.testing_types WHERE name = 'Event');

-- RLS 및 권한
ALTER TABLE public.testing_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read testing_types" ON public.testing_types;
CREATE POLICY "Allow read testing_types" ON public.testing_types
  FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Allow insert testing_types" ON public.testing_types;
CREATE POLICY "Allow insert testing_types" ON public.testing_types
  FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update testing_types" ON public.testing_types;
CREATE POLICY "Allow update testing_types" ON public.testing_types
  FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.testing_types TO anon, authenticated, service_role;
