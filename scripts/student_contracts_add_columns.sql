ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS uniform_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS equipment_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS other_fee numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
ALTER TABLE public.student_contracts ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;
