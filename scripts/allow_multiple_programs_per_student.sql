-- Allow one student to have multiple classes (programs) at the same time.
-- Removes the unique constraint that blocks "duplicate key student_contracts_active_program_uidx".
-- Run in Supabase SQL Editor once.

-- If it was created as a unique index:
DROP INDEX IF EXISTS public.student_contracts_active_program_uidx;

-- If it was created as a table constraint (index name may differ):
ALTER TABLE public.student_contracts DROP CONSTRAINT IF EXISTS student_contracts_active_program_uidx;

-- After this, a student can have multiple active contracts (e.g. Regular + Sparring, or multiple sections).
