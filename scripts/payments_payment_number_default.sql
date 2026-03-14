-- payments.payment_number NOT NULL 오류 해결: INSERT 시 값이 없으면 자동 생성
-- Supabase SQL Editor에서 전체 실행 (Run)

-- 1) 시퀀스 생성 (결제 번호용)
CREATE SEQUENCE IF NOT EXISTS public.payments_payment_number_seq;

-- 2) payment_number 컬럼에 기본값 설정 (예: PAY-20260313-00001)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_number'
  ) THEN
    EXECUTE 'ALTER TABLE public.payments ALTER COLUMN payment_number SET DEFAULT (
      ''PAY-'' || to_char(now(), ''YYYYMMDD'') || ''-'' ||
      lpad(nextval(''public.payments_payment_number_seq'')::text, 5, ''0'')
    )';
  END IF;
END $$;
