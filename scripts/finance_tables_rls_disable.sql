-- 재무 테이블 401 해결: RLS 끄고 GRANT로만 접근 허용 (정책 문제 시 이걸 실행)
-- Supabase SQL Editor에서 실행 후, 개발 서버 재시작·새로고침.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- invoices: RLS 끄고 읽기/쓰기 허용
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;

-- payments: RLS 끄고 읽기/쓰기 허용
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;

-- expenses: RLS 끄고 읽기/쓰기 허용 (테이블 있을 때만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
  END IF;
END $$;

-- payment_methods: 설정 > 결제 수단 페이지 (Permission denied 시 실행)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
    ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO anon, authenticated;
  END IF;
END $$;

-- expense_categories: 설정 > 지출 분류 페이지 (Permission denied 시 실행)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
    ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO anon, authenticated;
  END IF;
END $$;

-- business_settings: 설정 > 사업장 정보 페이지 (Permission denied 시 실행)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_settings') THEN
    ALTER TABLE public.business_settings DISABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO anon, authenticated;
  END IF;
END $$;
