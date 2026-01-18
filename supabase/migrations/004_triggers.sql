-- Migration 004: Waitlist Auto-Promotion Trigger
-- Automatically promotes the oldest waitlisted user when a confirmed booking is cancelled

-- ============================================================================
-- AUTO-PROMOTE WAITLIST FUNCTION
-- Fires when a booking is cancelled, promotes oldest waitlisted user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_promote_waitlist()
RETURNS TRIGGER AS $$
DECLARE
    v_oldest_waitlist_id UUID;
BEGIN
    -- Only proceed if status changed TO 'cancelled' FROM 'confirmed'
    IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
        
        -- Find the oldest waitlisted booking for this day
        -- Use FOR UPDATE SKIP LOCKED to prevent race conditions
        -- Multiple cancellations happening simultaneously will each promote a different user
        SELECT id INTO v_oldest_waitlist_id
        FROM public.bookings
        WHERE day_id = NEW.day_id
            AND status = 'waitlist'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
        
        -- If a waitlisted user exists, promote them
        IF v_oldest_waitlist_id IS NOT NULL THEN
            UPDATE public.bookings
            SET status = 'confirmed',
                updated_at = NOW()
            WHERE id = v_oldest_waitlist_id;
            
            RAISE NOTICE 'Promoted booking % from waitlist to confirmed', v_oldest_waitlist_id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Attach to bookings table
-- Fires AFTER UPDATE to allow the cancellation to complete first
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_promote_waitlist ON public.bookings;
CREATE TRIGGER trigger_auto_promote_waitlist
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status = 'confirmed')
    EXECUTE FUNCTION public.auto_promote_waitlist();
