-- Run this ENTIRE file in Supabase SQL Editor once (and after any change). Adds fee columns + RPC.
-- 0) Ensure student_contracts has required columns (run once; safe to re-run)
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS uniform_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS equipment_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS other_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS contract_price numeric;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS discount_amount numeric;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS final_price numeric;

CREATE OR REPLACE FUNCTION public.create_student_with_contract(
  p_student jsonb,
  p_tag_ids uuid[] DEFAULT '{}',
  p_contract jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_tag_id uuid;
  v_name text;
  v_contract_total numeric;
  v_equipment_line jsonb;
  v_pricing_item_id uuid;
  v_qty int;
  v_variant_id uuid;
  v_item_id uuid;
  v_current_stock int;
  v_start_date date;
  v_payment_number text;
  v_main_program_id uuid;
  v_extra_program_id uuid;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(p_student->>'full_name'), ''),
    NULLIF(TRIM(p_student->>'name'), ''),
    ' '
  );

  -- 1) Insert student (name never null)
  INSERT INTO public.students (
    student_code,
    name,
    full_name,
    photo_url,
    date_of_birth,
    gender,
    join_date,
    status,
    current_belt_id,
    parent_name,
    phone,
    email,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    medical_note,
    memo,
    parent_requests,
    active
  )
  SELECT
    (p_student->>'student_code')::text,
    v_name,
    COALESCE(NULLIF(TRIM(p_student->>'full_name'), ''), v_name),
    (p_student->>'photo_url')::text,
    NULLIF(p_student->>'date_of_birth', '')::date,
    NULLIF(p_student->>'gender', '')::text,
    NULLIF(p_student->>'join_date', '')::date,
    COALESCE(NULLIF(p_student->>'status', ''), 'active')::text,
    NULLIF(p_student->>'current_belt_id', '')::uuid,
    NULLIF(p_student->>'parent_name', '')::text,
    NULLIF(p_student->>'phone', '')::text,
    NULLIF(p_student->>'email', '')::text,
    NULLIF(p_student->>'address', '')::text,
    NULLIF(p_student->>'emergency_contact_name', '')::text,
    NULLIF(p_student->>'emergency_contact_phone', '')::text,
    NULLIF(p_student->>'emergency_contact_relationship', '')::text,
    NULLIF(p_student->>'medical_note', '')::text,
    NULLIF(p_student->>'memo', '')::text,
    NULLIF(p_student->>'parent_requests', '')::text,
    COALESCE((p_student->>'active')::boolean, true)
  RETURNING id INTO v_student_id;

  -- 2) Insert tag links
  IF array_length(p_tag_ids, 1) > 0 THEN
    FOREACH v_tag_id IN ARRAY p_tag_ids
    LOOP
      INSERT INTO public.student_tag_links (student_id, tag_id)
      VALUES (v_student_id, v_tag_id)
      ON CONFLICT (student_id, tag_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 3) Insert contract (use contract_price, discount_amount, final_price to match app/student detail)
  IF p_contract IS NOT NULL AND p_contract != 'null'::jsonb AND (p_contract->>'student_id') IS NULL THEN
    v_contract_total := COALESCE((p_contract->>'total_amount')::numeric, 0);
    INSERT INTO public.student_contracts (
      student_id,
      program_id,
      membership_duration_id,
      weekly_frequency_option_id,
      contract_type,
      status,
      start_date,
      end_date,
      registration_fee,
      contract_price,
      discount_amount,
      final_price,
      uniform_fee,
      equipment_fee,
      other_fee,
      total_amount,
      pricing_snapshot,
      note
    )
    SELECT
      v_student_id,
      NULLIF(p_contract->>'program_id', '')::uuid,
      NULLIF(p_contract->>'membership_duration_id', '')::uuid,
      NULLIF(p_contract->>'weekly_frequency_option_id', '')::uuid,
      COALESCE(NULLIF(p_contract->>'contract_type', ''), 'membership')::text,
      COALESCE(NULLIF(p_contract->>'status', ''), 'active')::text,
      NULLIF(TRIM(p_contract->>'start_date'), '')::date,
      NULLIF(TRIM(p_contract->>'end_date'), '')::date,
      COALESCE((p_contract->>'registration_fee')::numeric, 0),
      COALESCE((p_contract->>'tuition_fee')::numeric, 0),
      COALESCE((p_contract->>'discount_value')::numeric, 0),
      COALESCE((p_contract->>'final_tuition_fee')::numeric, 0),
      COALESCE((p_contract->>'uniform_fee')::numeric, 0),
      COALESCE((p_contract->>'equipment_fee')::numeric, 0),
      COALESCE((p_contract->>'other_fee')::numeric, 0),
      COALESCE((p_contract->>'total_amount')::numeric, 0),
      CASE WHEN p_contract ? 'pricing_snapshot' THEN (p_contract->'pricing_snapshot')::jsonb ELSE NULL END,
      NULLIF(p_contract->>'note', '')::text;
  ELSE
    v_contract_total := 0;
  END IF;

  -- 3b) 추가 선택 프로그램이 있으면 동일 조건으로 계약 추가 (새 회원 등록 시 선택한 프로그램 모두 등록)
  v_main_program_id := NULLIF(p_contract->>'program_id', '')::uuid;
  IF p_contract ? 'extra_program_ids' AND jsonb_typeof(p_contract->'extra_program_ids') = 'array'
     AND jsonb_array_length(p_contract->'extra_program_ids') > 0 THEN
    FOR v_extra_program_id IN
      SELECT (elem#>>'{}')::uuid
      FROM jsonb_array_elements(p_contract->'extra_program_ids') AS elem
      WHERE NULLIF(TRIM(elem#>>'{}'), '') IS NOT NULL
    LOOP
      IF v_extra_program_id IS NOT NULL AND (v_main_program_id IS NULL OR v_extra_program_id != v_main_program_id) THEN
        INSERT INTO public.student_contracts (
          student_id, program_id, membership_duration_id, weekly_frequency_option_id,
          contract_type, status, start_date, end_date,
          registration_fee, contract_price, discount_amount, final_price,
          uniform_fee, equipment_fee, other_fee, total_amount, pricing_snapshot, note
        )
        SELECT
          v_student_id, v_extra_program_id,
          NULLIF(p_contract->>'membership_duration_id', '')::uuid,
          NULLIF(p_contract->>'weekly_frequency_option_id', '')::uuid,
          COALESCE(NULLIF(p_contract->>'contract_type', ''), 'membership')::text,
          COALESCE(NULLIF(p_contract->>'status', ''), 'active')::text,
          NULLIF(TRIM(p_contract->>'start_date'), '')::date,
          NULLIF(TRIM(p_contract->>'end_date'), '')::date,
          COALESCE((p_contract->>'registration_fee')::numeric, 0),
          COALESCE((p_contract->>'tuition_fee')::numeric, 0),
          COALESCE((p_contract->>'discount_value')::numeric, 0),
          COALESCE((p_contract->>'final_tuition_fee')::numeric, 0),
          COALESCE((p_contract->>'uniform_fee')::numeric, 0),
          COALESCE((p_contract->>'equipment_fee')::numeric, 0),
          COALESCE((p_contract->>'other_fee')::numeric, 0),
          COALESCE((p_contract->>'total_amount')::numeric, 0),
          CASE WHEN p_contract ? 'pricing_snapshot' THEN (p_contract->'pricing_snapshot')::jsonb ELSE NULL END,
          NULLIF(p_contract->>'note', '')::text;
      END IF;
    END LOOP;
  END IF;

  -- 4) 회원가입 시 책정 금액(등록비+월비+유니폼 등)을 결제 1건으로 등록 → 대시보드 수입 반영
  -- payment_number가 NOT NULL이면 여기서 생성 (payments_payment_number_default.sql 미실행 시에도 동작)
  IF v_contract_total > 0 AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    v_payment_number := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(v_student_id::text || clock_timestamp()::text), 1, 8);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_number') THEN
        INSERT INTO public.payments (student_id, paid_at, paid_amount, payment_status, payment_number)
        VALUES (
          v_student_id,
          COALESCE((NULLIF(TRIM(p_contract->>'start_date'), '')::date)::timestamptz, now()),
          v_contract_total,
          'paid',
          v_payment_number
        );
      ELSE
        INSERT INTO public.payments (student_id, paid_at, paid_amount, payment_status)
        VALUES (
          v_student_id,
          COALESCE((NULLIF(TRIM(p_contract->>'start_date'), '')::date)::timestamptz, now()),
          v_contract_total,
          'paid'
        );
      END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_date') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_number') THEN
        INSERT INTO public.payments (student_id, payment_date, payment_amount, payment_status, payment_number)
        VALUES (
          v_student_id,
          COALESCE(NULLIF(TRIM(p_contract->>'start_date'), '')::date, current_date),
          v_contract_total,
          'paid',
          v_payment_number
        );
      ELSE
        INSERT INTO public.payments (student_id, payment_date, payment_amount, payment_status)
        VALUES (
          v_student_id,
          COALESCE(NULLIF(TRIM(p_contract->>'start_date'), '')::date, current_date),
          v_contract_total,
          'paid'
        );
      END IF;
    END IF;
  END IF;

  -- 5) 유니폼/운동용품: equipment_lines에 있는 품목은 인벤토리 재고 차감 (pricing_items.inventory_variant_id 연결 시)
  v_start_date := COALESCE(NULLIF(TRIM(p_contract->>'start_date'), '')::date, current_date);
  IF p_contract ? 'pricing_snapshot' AND p_contract->'pricing_snapshot' ? 'equipment_lines'
     AND jsonb_array_length(p_contract->'pricing_snapshot'->'equipment_lines') > 0
     AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_movements')
     AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_variants') THEN
    FOR v_equipment_line IN SELECT * FROM jsonb_array_elements(p_contract->'pricing_snapshot'->'equipment_lines')
    LOOP
      v_pricing_item_id := NULLIF(TRIM(v_equipment_line->>'pricing_item_id'), '')::uuid;
      v_qty := GREATEST(0, COALESCE((v_equipment_line->>'quantity')::int, 0));
      IF v_pricing_item_id IS NULL OR v_qty = 0 THEN CONTINUE; END IF;
      SELECT pi.inventory_variant_id, iv.inventory_item_id, iv.stock_quantity
        INTO v_variant_id, v_item_id, v_current_stock
        FROM public.pricing_items pi
        LEFT JOIN public.inventory_variants iv ON iv.id = pi.inventory_variant_id
        WHERE pi.id = v_pricing_item_id;
      IF v_variant_id IS NULL OR v_current_stock IS NULL THEN CONTINUE; END IF;
      IF v_qty > v_current_stock THEN CONTINUE; END IF;
      INSERT INTO public.inventory_movements (
        inventory_item_id, inventory_variant_id, direction, quantity, reason, student_id, movement_date
      ) VALUES (
        v_item_id, v_variant_id, 'out', v_qty, 'sale', v_student_id, v_start_date
      );
      UPDATE public.inventory_variants SET stock_quantity = stock_quantity - v_qty WHERE id = v_variant_id;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('student_id', v_student_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- RLS: anon/authenticated can execute (실행 권한)
GRANT EXECUTE ON FUNCTION public.create_student_with_contract(jsonb, uuid[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_with_contract(jsonb, uuid[], jsonb) TO anon;

COMMENT ON FUNCTION public.create_student_with_contract(jsonb, uuid[], jsonb) IS
  'Creates student, tag links, and first contract in one transaction. Returns { student_id: uuid }.';
