SELECT routine_name AS "함수 이름"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_student_with_contract';
