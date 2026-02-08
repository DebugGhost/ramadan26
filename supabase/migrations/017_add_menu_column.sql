-- Migration 017: Add menu_item column to days table
-- Stores the food/menu description for each Iftar day

ALTER TABLE public.days 
ADD COLUMN IF NOT EXISTS menu_item TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.days.menu_item IS 'The food/menu description for the Iftar day';
