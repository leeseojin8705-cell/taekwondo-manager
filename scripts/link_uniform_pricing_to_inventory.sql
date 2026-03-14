-- 유니폼 등 Extra Fee 품목을 인벤토리 variant와 연결 (학생 등록 시 재고 자동 차감)
-- 1) pricing_items에 inventory_variant_id 컬럼 추가 (없으면)
-- 2) name이 'uniform'인 pricing_item을 name에 'uniform' 포함된 inventory_item의 첫 variant와 연결
-- Supabase SQL Editor에서 실행

-- 컬럼 추가 (pricing_items_inventory_link.sql과 동일)
ALTER TABLE public.pricing_items ADD COLUMN IF NOT EXISTS inventory_variant_id uuid REFERENCES public.inventory_variants(id) ON DELETE SET NULL;

-- 유니폼: pricing_items.name = 'uniform' (또는 유사) → inventory_items.name에 uniform 포함된 항목의 첫 variant
UPDATE public.pricing_items pi
SET inventory_variant_id = (
  SELECT iv.id
  FROM public.inventory_variants iv
  JOIN public.inventory_items ii ON ii.id = iv.inventory_item_id
  WHERE ii.name ILIKE '%uniform%'
  ORDER BY iv.created_at
  LIMIT 1
)
WHERE (pi.name ILIKE '%uniform%' OR pi.category = 'uniform')
  AND pi.inventory_variant_id IS NULL
  AND EXISTS (SELECT 1 FROM public.inventory_variants iv JOIN public.inventory_items ii ON ii.id = iv.inventory_item_id WHERE ii.name ILIKE '%uniform%' LIMIT 1);
