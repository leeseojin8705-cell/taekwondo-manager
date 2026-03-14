CREATE TABLE IF NOT EXISTS public.program_period_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  period_months smallint NOT NULL CHECK (period_months > 0),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  registration_fee numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, period_months)
);

CREATE INDEX IF NOT EXISTS idx_program_period_prices_program
  ON public.program_period_prices(program_id);
CREATE INDEX IF NOT EXISTS idx_program_period_prices_period
  ON public.program_period_prices(period_months);

ALTER TABLE public.program_period_prices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'program_period_prices')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.program_period_prices', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow authenticated all on program_period_prices"
  ON public.program_period_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on program_period_prices"
  ON public.program_period_prices FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON public.program_period_prices TO authenticated, anon;

COMMENT ON TABLE public.program_period_prices IS 'Price per program per period (1, 3, 6, 12, 24 months). Used for contract options.';
