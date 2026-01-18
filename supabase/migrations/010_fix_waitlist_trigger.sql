-- Migration: Update Waitlist Promotion Trigger to handle DELETEs
-- Used when a confirmed booking is deleted instead of updated to 'cancelled'

CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_oldest_waitlist_id UUID;
    v_day_id DATE;
    v_was_confirmed BOOLEAN;
BEGIN
    -- Determine operation type
    IF (TG_OP = 'DELETE') THEN
        v_day_id := OLD.day_id;
        v_was_confirmed := (OLD.status = 'confirmed');
    ELSE
        -- Should not happen with current trigger logic, but for safety
        RETURN NULL;
    END IF;

    -- Only proceed if the removed booking was confirmed
    IF v_was_confirmed THEN
        
        -- Find the oldest waitlisted booking for this day
        SELECT id INTO v_oldest_waitlist_id
        FROM public.bookings
        WHERE day_id = v_day_id
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

    RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop verify existing outdated trigger
DROP TRIGGER IF EXISTS trigger_auto_promote_waitlist ON public.bookings;

-- Create new trigger for DELETE operations
CREATE TRIGGER trigger_promote_on_delete
    AFTER DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_cancellation();
