-- 신규 회원 저장 후 "다음 창"(인쇄 페이지) Failed to load / 401 해결
-- Supabase SQL Editor에서 이 파일 전체 실행

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read students" ON public.students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert students" ON public.students FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update students" ON public.students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_contracts')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_contracts', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read student_contracts" ON public.student_contracts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert student_contracts" ON public.student_contracts FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.student_tag_links ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_tag_links')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_tag_links', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read student_tag_links" ON public.student_tag_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert student_tag_links" ON public.student_tag_links FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_tags')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_tags', r.policyname); END LOOP;
END $$;
CREATE POLICY "Allow read student_tags" ON public.student_tags FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.students TO anon, authenticated;
GRANT SELECT, INSERT ON public.student_contracts TO anon, authenticated;
GRANT SELECT, INSERT ON public.student_tag_links TO anon, authenticated;
GRANT SELECT ON public.student_tags TO anon, authenticated;
