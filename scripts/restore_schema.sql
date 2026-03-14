-- Restore schema: run in Supabase SQL Editor if you accidentally dropped columns or tables.
-- Each block is safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1) Belts: stripes column (for belt stripes)
ALTER TABLE public.belts
ADD COLUMN IF NOT EXISTS stripes smallint NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.belts.stripes IS 'Number of stripes on the belt (0 = no stripes)';

-- 2) Students: parent_requests (free-text "what parent wants")
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS parent_requests text;
COMMENT ON COLUMN public.students.parent_requests IS 'What the parent/guardian wants for this student (free text).';

-- 3) Student tags (if tables were dropped)
CREATE TABLE IF NOT EXISTS public.student_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.student_tags(id) ON DELETE CASCADE,
  UNIQUE(student_id, tag_id)
);

-- 4) Pricing items (if table was dropped - for equipment/supplies in pricing plan)
CREATE TABLE IF NOT EXISTS public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit_price numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5) Programs: price column (if missing)
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS price numeric(10,2);
