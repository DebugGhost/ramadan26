-- Migration 003: Database Functions
-- Contains the reserve_spot RPC function and profile creation trigger

-- ============================================================================
-- RESERVE SPOT FUNCTION
-- Atomically reserves a spot for a user, handling capacity enforcement
-- Returns: CONFIRMED, WAITLISTED, ALREADY_BOOKED, DAY_CLOSED, or FULL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_spot(day_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_capacity_limit INTEGER;
    v_is_open BOOLEAN;
    v_confirmed_count INTEGER;
    v_waitlist_count INTEGER;
    v_existing_booking_id UUID;
    v_max_waitlist INTEGER := 10;
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
    
    -- Count current confirmed bookings (with lock to prevent race conditions)
    SELECT COUNT(*)
    INTO v_confirmed_count
    FROM public.bookings
    WHERE day_id = day_date
        AND status = 'confirmed'
    FOR UPDATE;
    
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reserve_spot(DATE) TO authenticated;

-- ============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Automatically creates a profile row when a user signs up via OAuth
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
