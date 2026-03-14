-- 재무(invoices, payments, expenses) 테이블에 앱이 요청하는 컬럼 추가 (400 방지)
-- 테이블이 이미 있을 때만 실행. Supabase SQL Editor에서 실행.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_date date;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date date;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_category text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_status text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount numeric(14,2);
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2);
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS balance_amount numeric(14,2);
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2);
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status text;
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_date date;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount numeric(14,2);
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_name text;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_category_id uuid;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method_id uuid;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS note text;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS attachment_url text;
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.expenses'::regclass AND contype = 'p') THEN
      ALTER TABLE public.expenses ADD PRIMARY KEY (id);
    END IF;
  END IF;
END $$;
