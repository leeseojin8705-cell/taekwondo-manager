-- 인벤토리 테이블 컬럼 보강 (400 방지) - 기존 테이블에 앱이 쓰는 컬럼 추가
-- inventory_tables_create.sql 실행 후 또는 기존 테이블이 있을 때 Supabase SQL Editor에서 실행.

-- inventory_categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_categories') THEN
    ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
    ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
    ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- inventory_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS sku text;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS sale_price numeric(14,2) DEFAULT 0;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS cost_price numeric(14,2) DEFAULT 0;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT true;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS note text;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS category_id uuid;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- inventory_variants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_variants') THEN
    ALTER TABLE public.inventory_variants ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- inventory_movements (400 방지: 앱이 select하는 컬럼이 없으면 추가)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_movements') THEN
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS movement_date date DEFAULT CURRENT_DATE;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS direction text;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS quantity int DEFAULT 0;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS unit_cost numeric(14,2);
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS total_cost numeric(14,2);
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reason text;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS vendor_name text;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_type text;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_id uuid;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS note text;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS inventory_item_id uuid;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS inventory_variant_id uuid;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS student_id uuid;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  END IF;
END $$;
