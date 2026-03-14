-- "permission denied for table students" 해결
-- Supabase SQL Editor에서 이 파일 전체 실행 (Run)

-- 1) 테이블 권한 (anon, authenticated, service_role 모두)
GRANT SELECT, INSERT, UPDATE ON public.students TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.student_contracts TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.student_tag_links TO anon, authenticated, service_role;
GRANT SELECT ON public.student_tags TO anon, authenticated, service_role;
GRANT SELECT ON public.belts TO anon, authenticated, service_role;

-- 2) RLS 켜고 정책 추가 (anon/authenticated가 읽을 수 있도록)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read students" ON public.students;
CREATE POLICY "Allow read students" ON public.students FOR SELECT TO anon, authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow insert students" ON public.students;
CREATE POLICY "Allow insert students" ON public.students FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update students" ON public.students;
CREATE POLICY "Allow update students" ON public.students FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read student_contracts" ON public.student_contracts;
CREATE POLICY "Allow read student_contracts" ON public.student_contracts FOR SELECT TO anon, authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow insert student_contracts" ON public.student_contracts;
CREATE POLICY "Allow insert student_contracts" ON public.student_contracts FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
