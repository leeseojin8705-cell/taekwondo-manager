-- 인벤토리 테이블 생성 (inventory_categories, inventory_items, inventory_variants, inventory_movements)
-- Supabase SQL Editor에서 실행. 이미 있으면 무시됨.

-- 1. inventory_categories
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  sale_price numeric(14,2) DEFAULT 0,
  cost_price numeric(14,2) DEFAULT 0,
  track_stock boolean DEFAULT true,
  active boolean DEFAULT true,
  note text,
  category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. inventory_variants
CREATE TABLE IF NOT EXISTS public.inventory_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  stock_quantity int DEFAULT 0,
  low_stock_threshold int DEFAULT 0,
  sale_price_override numeric(14,2),
  cost_price_override numeric(14,2),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  unit_cost numeric(14,2),
  total_cost numeric(14,2),
  reason text,
  vendor_name text,
  reference_type text,
  reference_id uuid,
  note text,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  inventory_variant_id uuid REFERENCES public.inventory_variants(id) ON DELETE SET NULL,
  student_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 기존 테이블에 컬럼이 없으면 추가 (이미 있을 때 category_id 없음 오류 방지)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 (category_id 있을 때만 생성)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_inventory_variants_item ON public.inventory_variants(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements(inventory_variant_id);

-- RLS 끄고 읽기/쓰기 허용 (401 방지)
ALTER TABLE public.inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_variants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO anon, authenticated;
