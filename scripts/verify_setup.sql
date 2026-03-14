-- SQL 점검: Supabase SQL Editor에서 실행 후 결과 확인. '없음'이 있으면 안내된 스크립트 실행.
SELECT '=== 신규 회원 가입 (create_student_with_contract) ===' AS "확인 항목", '' AS "결과"
UNION ALL
SELECT 'create_student_with_contract RPC',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'create_student_with_contract'
  ) THEN 'OK' ELSE '없음 → create_student_with_contract_rpc.sql 전체 실행' END
UNION ALL
SELECT 'students.name 컬럼',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='name') THEN 'OK' ELSE '없음' END
UNION ALL
SELECT 'students.full_name 컬럼',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='full_name') THEN 'OK' ELSE '없음' END
UNION ALL
SELECT 'student_contracts.uniform_fee',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='student_contracts' AND column_name='uniform_fee') THEN 'OK' ELSE '없음 → create_student_with_contract_rpc.sql 실행' END
UNION ALL
SELECT 'student_contracts.total_amount',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='student_contracts' AND column_name='total_amount') THEN 'OK' ELSE '없음 → create_student_with_contract_rpc.sql 실행' END
UNION ALL
SELECT 'student_tag_links 테이블',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_tag_links') THEN 'OK' ELSE '없음 (restore_schema.sql)' END
UNION ALL
SELECT 'student_medical_body_notes 테이블',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_medical_body_notes') THEN 'OK' ELSE '없음 (student_medical_body_notes_fix.sql 실행)' END
UNION ALL
SELECT 'students RLS 정책',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students') THEN 'OK' ELSE '없음 → students_rls_allow.sql 실행' END
UNION ALL
SELECT '=== 기타 ===', ''
UNION ALL
SELECT 'programs 테이블',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programs') THEN 'OK' ELSE '없음' END
UNION ALL
SELECT 'pricing_items 테이블',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_items') THEN 'OK' ELSE '없음' END
UNION ALL
SELECT 'programs RLS 정책',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'programs') THEN 'OK' ELSE '없음 (pricing_full_setup.sql)' END
UNION ALL
SELECT 'pricing_items RLS 정책',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pricing_items') THEN 'OK' ELSE '없음' END
UNION ALL
SELECT 'program_period_prices 테이블',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_period_prices') THEN 'OK' ELSE '없음 (program_period_prices.sql)' END;
