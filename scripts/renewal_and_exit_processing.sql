-- 리뉴얼 시 수익 집계 + 리뉴얼 기간 지나면 퇴관 처리
-- Supabase SQL Editor에서 전체 실행 (Run)

-- 1) 만료된 계약을 'ended'로, 활성 계약 없는 학생을 'inactive'로 (퇴관 처리)
CREATE OR REPLACE FUNCTION public.mark_expired_contracts_and_exits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_contracts
  SET status = 'ended'
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < current_date;

  UPDATE public.students s
  SET status = 'inactive'
  WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.student_contracts c
      WHERE c.student_id = s.id
        AND c.status = 'active'
        AND (c.end_date IS NULL OR c.end_date >= current_date)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_expired_contracts_and_exits() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.mark_expired_contracts_and_exits() IS '만료된 계약 ended, 활성 계약 없는 학생 inactive(퇴관). Cron 또는 앱에서 주기 호출 권장.';

-- 2) 리뉴얼 시 새 계약 + 결제 생성 (수익 반영)
CREATE OR REPLACE FUNCTION public.renew_contract_with_payment(
  p_student_id uuid,
  p_program_id uuid,
  p_start_date date,
  p_end_date date,
  p_total_amount numeric DEFAULT 0,
  p_weekly_frequency_option_id uuid DEFAULT NULL,
  p_membership_duration_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  INSERT INTO public.student_contracts (
    student_id, program_id, weekly_frequency_option_id, membership_duration_id,
    contract_type, status, start_date, end_date, total_amount
  )
  VALUES (
    p_student_id, p_program_id, p_weekly_frequency_option_id, p_membership_duration_id,
    'membership', 'active', p_start_date, p_end_date, COALESCE(p_total_amount, 0)
  )
  RETURNING id INTO v_contract_id;

  IF COALESCE(p_total_amount, 0) > 0 AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at') THEN
      INSERT INTO public.payments (student_id, paid_at, paid_amount, payment_status)
      VALUES (p_student_id, p_start_date::timestamptz, p_total_amount, 'paid');
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_date') THEN
      INSERT INTO public.payments (student_id, payment_date, payment_amount, payment_status)
      VALUES (p_student_id, p_start_date, p_total_amount, 'paid');
    END IF;
  END IF;

  RETURN jsonb_build_object('student_id', p_student_id, 'contract_id', v_contract_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.renew_contract_with_payment(uuid,uuid,date,date,numeric,uuid,uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.renew_contract_with_payment(uuid,uuid,date,date,numeric,uuid,uuid) IS '리뉴얼: 새 계약 생성 + 결제 1건 생성 → 대시보드 수익 반영.';
