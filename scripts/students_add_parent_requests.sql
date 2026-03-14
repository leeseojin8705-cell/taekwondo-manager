-- Add column for free-text "what the parent wants" on student form.
-- Run this if your students table does not yet have parent_requests.

ALTER TABLE students
ADD COLUMN IF NOT EXISTS parent_requests text;

COMMENT ON COLUMN students.parent_requests IS 'What the parent/guardian wants for this student (free text from registration/edit form).';
