-- Register Program, kiosk, and other flows call create_payment_record to log tuition/uniform/etc.
-- Run this in Supabase SQL Editor once. Requires public.payments to exist (see finance_tables_columns_fix.sql).
-- Ensures payment_number is set so NOT NULL constraint is satisfied everywhere (kiosk, register, etc.).

CREATE SEQUENCE IF NOT EXISTS public.payments_payment_number_seq;

CREATE OR REPLACE FUNCTION public.create_payment_record(
  p_student_id uuid,
  p_payment_date text,
  p_payment_method text,
  p_note text,
  p_status text,
  p_original_amount numeric,
  p_discount_amount numeric DEFAULT 0,
  p_discount_note text DEFAULT NULL,
  p_billing_start_date text DEFAULT NULL,
  p_billing_end_date text DEFAULT NULL,
  p_is_renewal boolean DEFAULT false,
  p_income_category text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_amount numeric;
  v_date date;
  v_payment_number text;
BEGIN
  v_amount := COALESCE(p_original_amount, 0) - COALESCE(p_discount_amount, 0);
  IF v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  v_date := NULL;
  IF p_payment_date IS NOT NULL AND p_payment_date <> '' THEN
    v_date := (p_payment_date::text)::date;
  END IF;
  IF v_date IS NULL THEN
    v_date := CURRENT_DATE;
  END IF;

  -- Generate payment_number so NOT NULL is satisfied (kiosk, register program, etc.)
  v_payment_number := 'PAY-' || to_char(v_date, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.payments_payment_number_seq')::text, 5, '0');

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_date') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_number') THEN
      INSERT INTO public.payments (student_id, payment_date, payment_amount, payment_status, payment_number, note)
      VALUES (p_student_id, v_date, v_amount, COALESCE(p_status, 'paid'), v_payment_number, p_note)
      RETURNING id INTO v_id;
    ELSE
      INSERT INTO public.payments (student_id, payment_date, payment_amount, payment_status, note)
      VALUES (p_student_id, v_date, v_amount, COALESCE(p_status, 'paid'), p_note)
      RETURNING id INTO v_id;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_number') THEN
      INSERT INTO public.payments (student_id, paid_at, paid_amount, payment_status, payment_number, note)
      VALUES (p_student_id, v_date::timestamptz, v_amount, COALESCE(p_status, 'paid'), v_payment_number, p_note)
      RETURNING id INTO v_id;
    ELSE
      INSERT INTO public.payments (student_id, paid_at, paid_amount, payment_status, note)
      VALUES (p_student_id, v_date::timestamptz, v_amount, COALESCE(p_status, 'paid'), p_note)
      RETURNING id INTO v_id;
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payment_record(uuid,text,text,text,text,numeric,numeric,text,text,text,boolean,text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.create_payment_record IS 'Insert one payment row. Used by Register Program, kiosk, and other flows. Sets payment_number when column exists to satisfy NOT NULL.';
