-- Seed data for Second Demo (Jan 29th)
-- 1. Cleans up any existing bookings for demo days to start fresh
-- 2. Sets up Today (29th) and Tomorrow (30th) with capacity 2
-- 3. Sets Waitlist limit to 1

-- Clear existing bookings for these days to ensure clean slate
DELETE FROM public.bookings WHERE day_id IN ('2026-01-29', '2026-01-30');

-- Insert/Update Days
INSERT INTO public.days (date, is_open, capacity_limit)
VALUES 
    ('2026-01-29', true, 2),
    ('2026-01-30', true, 2)
ON CONFLICT (date) DO UPDATE
SET 
    is_open = EXCLUDED.is_open,
    capacity_limit = EXCLUDED.capacity_limit;

-- Update function to restrict waitlist to 1
CREATE OR REPLACE FUNCTION public.reserve_spot(day_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_capacity_limit INTEGER;
    v_is_open BOOLEAN;
    v_confirmed_count INTEGER;
    v_waitlist_count INTEGER;
    v_existing_booking_id UUID;
    v_max_waitlist INTEGER := 1; -- RESTRICTED TO 1 FOR DEMO
BEGIN
    -- Get the current user ID from auth context
    v_user_id := auth.uid();
    
    -- Validate user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Lock the day row to prevent race conditions (FOR UPDATE ensures atomic read)
    SELECT capacity_limit, is_open
    INTO v_capacity_limit, v_is_open
    FROM public.days
    WHERE date = day_date
    FOR UPDATE;
    
    -- Check if day exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Day not found';
    END IF;
    
    -- Check if day is open for bookings
    IF v_is_open = FALSE THEN
        RETURN 'DAY_CLOSED';
    END IF;
    
    -- Check if user already has a booking for this day (excluding cancelled)
    SELECT id INTO v_existing_booking_id
    FROM public.bookings
    WHERE user_id = v_user_id
        AND day_id = day_date
        AND status IN ('confirmed', 'waitlist');
    
    IF v_existing_booking_id IS NOT NULL THEN
        RETURN 'ALREADY_BOOKED';
    END IF;
    
    -- Count current confirmed bookings
    SELECT COUNT(*)
    INTO v_confirmed_count
    FROM public.bookings
    WHERE day_id = day_date
        AND status = 'confirmed';
    
    -- Count current waitlist bookings
    SELECT COUNT(*)
    INTO v_waitlist_count
    FROM public.bookings
    WHERE day_id = day_date
        AND status = 'waitlist';
    
    -- Determine status based on capacity
    IF v_confirmed_count < v_capacity_limit THEN
        -- Confirmed spot available
        INSERT INTO public.bookings (user_id, day_id, status)
        VALUES (v_user_id, day_date, 'confirmed');
        RETURN 'CONFIRMED';
        
    ELSIF v_waitlist_count < v_max_waitlist THEN
        -- Waitlist spot available
        INSERT INTO public.bookings (user_id, day_id, status)
        VALUES (v_user_id, day_date, 'waitlist');
        RETURN 'WAITLISTED';
        
    ELSE
        -- Both confirmed and waitlist are full
        RETURN 'FULL';
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
