-- 대시보드/재무 금액이 0으로만 나올 때: payments, expenses, invoices 읽기 권한
-- Supabase SQL Editor에서 이 파일 전체 실행 (Run)

-- 1) 테이블 권한 (anon, authenticated, service_role)
GRANT SELECT, INSERT, UPDATE ON public.payments TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.expenses TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO anon, authenticated, service_role;

-- 2) RLS 정책 (읽기 허용)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read payments" ON public.payments;
CREATE POLICY "Allow read payments" ON public.payments FOR SELECT TO anon, authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow insert payments" ON public.payments;
CREATE POLICY "Allow insert payments" ON public.payments FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update payments" ON public.payments;
CREATE POLICY "Allow update payments" ON public.payments FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read expenses" ON public.expenses;
CREATE POLICY "Allow read expenses" ON public.expenses FOR SELECT TO anon, authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow insert expenses" ON public.expenses;
CREATE POLICY "Allow insert expenses" ON public.expenses FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read invoices" ON public.invoices;
CREATE POLICY "Allow read invoices" ON public.invoices FOR SELECT TO anon, authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow insert invoices" ON public.invoices;
CREATE POLICY "Allow insert invoices" ON public.invoices FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update invoices" ON public.invoices;
CREATE POLICY "Allow update invoices" ON public.invoices FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);
