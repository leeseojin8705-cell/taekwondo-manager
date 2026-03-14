-- 재무 테이블(invoices, payments, expenses) RLS: 인증 사용자 읽기 허용 (400/401 방지)
-- finance_tables_columns_fix.sql 실행 후 Supabase SQL Editor에서 실행.

-- 스키마 사용 권한 (401 방지에 필요할 수 있음)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert update delete invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert update delete payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;

-- expenses
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', r.policyname); END LOOP;
    CREATE POLICY "Allow read expenses" ON public.expenses FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "Allow insert update delete expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
  END IF;
END $$;

-- payment_methods (설정 > 결제 수단)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
    ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_methods')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_methods', r.policyname); END LOOP;
    CREATE POLICY "Allow all payment_methods" ON public.payment_methods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO anon, authenticated;
  END IF;
END $$;

-- expense_categories (설정 > 지출 분류)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
    ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_categories')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.expense_categories', r.policyname); END LOOP;
    CREATE POLICY "Allow all expense_categories" ON public.expense_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO anon, authenticated;
  END IF;
END $$;

-- business_settings (설정 > 사업장 정보)
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_settings') THEN
    ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_settings')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.business_settings', r.policyname); END LOOP;
    CREATE POLICY "Allow all business_settings" ON public.business_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO anon, authenticated;
  END IF;
END $$;
