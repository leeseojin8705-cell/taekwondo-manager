-- Create programs table if missing, so "Create Program" on Pricing Plan works.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2),
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure columns used by the app exist
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS sort_order smallint DEFAULT 0;

-- If "Failed to create program" persists: in Supabase Dashboard > Table Editor > programs,
-- check that the table exists and has columns: name, price, active, sort_order.
-- If RLS is enabled, add a policy that allows INSERT for your role (e.g. authenticated).
