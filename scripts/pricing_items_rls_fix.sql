-- ============================================================
-- "Extra fees could not be loaded (table or RLS)" 해결
-- Supabase Dashboard > SQL Editor 에서 이 스크립트 전체 실행 후, 페이지 새로고침.
-- ============================================================

-- 1) pricing_items 테이블 없으면 생성
CREATE TABLE IF NOT EXISTS public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit_price numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2) 스키마/테이블 권한
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.pricing_items TO authenticated, anon;

-- 3) RLS: 기존 정책 전부 제거 후 허용 정책만 생성
ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pricing_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pricing_items', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow authenticated all on pricing_items"
  ON public.pricing_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon all on pricing_items"
  ON public.pricing_items FOR ALL TO anon
  USING (true) WITH CHECK (true);
