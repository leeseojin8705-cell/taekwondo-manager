-- pricing_items와 인벤토리 연동: 유니폼/용품 판매 시 재고 자동 차감
-- Supabase SQL Editor에서 실행

ALTER TABLE public.pricing_items ADD COLUMN IF NOT EXISTS inventory_variant_id uuid REFERENCES public.inventory_variants(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.pricing_items.inventory_variant_id IS 'Link to inventory variant; when sold at registration, stock is decreased.';
