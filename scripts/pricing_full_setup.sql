-- ============================================================
-- Pricing Plan 페이지가 전부 작동하도록 테이블 + RLS 한 번에 설정
-- Supabase Dashboard > SQL Editor 에서 통째로 실행하세요.
-- 401 / permission denied / table not in schema cache 발생 시 이 스크립트 실행 후 재시도.
-- ============================================================

-- 0) 스키마 사용 권한 (401 방지)
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- 1) programs 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2),
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS sort_order smallint DEFAULT 0;

-- 2) pricing_items 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit_price numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3) RLS: programs — 기존 정책 전부 제거 후 허용 정책만 생성
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'programs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.programs', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Allow authenticated all on programs" ON public.programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on programs" ON public.programs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4) RLS: pricing_items — 기존 정책 전부 제거 후 허용 정책만 생성
ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pricing_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pricing_items', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Allow authenticated all on pricing_items" ON public.pricing_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on pricing_items" ON public.pricing_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5) belts 테이블이 있으면 RLS — 기존 정책 제거 후 허용만
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'belts') THEN
    EXECUTE 'ALTER TABLE public.belts ENABLE ROW LEVEL SECURITY';
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'belts')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.belts', r.policyname);
    END LOOP;
    EXECUTE 'CREATE POLICY "Allow authenticated all on belts" ON public.belts FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon all on belts" ON public.belts FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 6) pricing_plans 테이블이 있으면 RLS — 기존 정책 제거 후 허용만
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_plans') THEN
    EXECUTE 'ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY';
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pricing_plans')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pricing_plans', r.policyname);
    END LOOP;
    EXECUTE 'CREATE POLICY "Allow authenticated all on pricing_plans" ON public.pricing_plans FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon all on pricing_plans" ON public.pricing_plans FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 7) 권한 부여
GRANT ALL ON public.programs TO authenticated, anon;
GRANT ALL ON public.pricing_items TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'belts') THEN
    GRANT ALL ON public.belts TO authenticated, anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_plans') THEN
    GRANT ALL ON public.pricing_plans TO authenticated, anon;
  END IF;
END $$;

-- 8) 기본 권한 (앞으로 생성되는 테이블에 anon/authenticated 접근 허용에 도움)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon;
