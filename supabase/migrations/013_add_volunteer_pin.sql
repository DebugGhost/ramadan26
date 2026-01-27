-- Migration 013: Add Volunteer PIN
-- Adds volunteer_pin to days table and populates with random 4-digit codes

-- 1. Add column
ALTER TABLE public.days
ADD COLUMN IF NOT EXISTS volunteer_pin TEXT;

-- 2. Function to generate random 4-digit pin
CREATE OR REPLACE FUNCTION public.generate_random_pin()
RETURNS TEXT AS $$
BEGIN
    RETURN lpad(floor(random() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Populate existing days with random pins
UPDATE public.days
SET volunteer_pin = public.generate_random_pin()
WHERE volunteer_pin IS NULL;

-- 4. Clean up helper function
DROP FUNCTION public.generate_random_pin();

-- 5. Add index (optional, but good practice if querying often)
-- CREATE INDEX IF NOT EXISTS idx_days_volunteer_pin ON public.days(volunteer_pin);
