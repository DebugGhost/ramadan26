-- Migration: Add Muslim confirmation tracking to bookings
-- This migration adds a column to track Muslim confirmation for each booking

-- Add confirmed_muslim column to bookings table
ALTER TABLE bookings
ADD COLUMN confirmed_muslim BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN bookings.confirmed_muslim IS 'Tracks whether the user confirmed they are Muslim when making the reservation';

-- Update the reserve_spot function to accept and store the confirmation
CREATE OR REPLACE FUNCTION reserve_spot(day_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_day record;
    v_current_confirmed INT;
    v_current_waitlist INT;
    v_existing_booking record;
BEGIN
    -- Get the current user ID from auth context
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN 'AUTH_ERROR';
    END IF;

    -- Check if day exists and is open
    SELECT * INTO v_day FROM days WHERE id = day_date;
    
    IF NOT FOUND THEN
        RETURN 'DAY_NOT_FOUND';
    END IF;
    
    IF NOT v_day.is_open THEN
        RETURN 'DAY_CLOSED';
    END IF;

    -- Check if user already has a booking for this day
    SELECT * INTO v_existing_booking 
    FROM bookings 
    WHERE user_id = v_user_id 
      AND day_id = day_date 
      AND status IN ('confirmed', 'waitlist');
    
    IF FOUND THEN
        RETURN 'ALREADY_BOOKED';
    END IF;

    -- Count current confirmed and waitlist bookings
    SELECT COUNT(*) INTO v_current_confirmed
    FROM bookings
    WHERE day_id = day_date AND status = 'confirmed';

    SELECT COUNT(*) INTO v_current_waitlist
    FROM bookings
    WHERE day_id = day_date AND status = 'waitlist';

    -- Determine if user gets confirmed spot or waitlist
    IF v_current_confirmed < v_day.capacity_limit THEN
        -- User gets confirmed spot
        INSERT INTO bookings (user_id, day_id, status, confirmed_muslim)
        VALUES (v_user_id, day_date, 'confirmed', true);
        RETURN 'CONFIRMED';
    ELSIF v_current_waitlist < v_day.waitlist_limit THEN
        -- User gets waitlisted
        INSERT INTO bookings (user_id, day_id, status, confirmed_muslim)
        VALUES (v_user_id, day_date, 'waitlist', true);
        RETURN 'WAITLISTED';
    ELSE
        -- Both confirmed and waitlist are full
        RETURN 'FULL';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
