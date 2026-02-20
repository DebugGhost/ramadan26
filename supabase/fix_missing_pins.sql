-- Fix missing volunteer pins for days
-- Run this in your Supabase SQL Editor to make the volunteer page work

DO $$
BEGIN
    -- Check if column exists (it should, but just in case)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'days' AND column_name = 'volunteer_pin') THEN
        
        -- Update any days that have NULL volunteer_pin with a random 4-digit code
        UPDATE public.days
        SET volunteer_pin = lpad(floor(random() * 10000)::text, 4, '0')
        WHERE volunteer_pin IS NULL;
        
        RAISE NOTICE 'Updated missing volunteer pins';
    ELSE
        RAISE NOTICE 'volunteer_pin column does not exist on table days';
    END IF;
END $$;
