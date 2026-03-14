-- 띠마다 스트라이프(줄) 수를 저장하는 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.belts
ADD COLUMN IF NOT EXISTS stripes smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.belts.stripes IS 'Number of stripes on the belt (0 = no stripes, e.g. plain color)';
