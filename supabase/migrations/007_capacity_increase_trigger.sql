-- Migration 007: Capacity Increase Auto-Promotion Trigger
-- Automatically promotes waitlisted users when the capacity_limit of a day is increased

-- ============================================================================
-- FUNCTION: Promote On Capacity Increase
-- Fires when days.capacity_limit increases.
-- Checks how many confirmed spots are now free (new_limit - current_confirmed).
-- Promotes that many users from waitlist (ordered by creation time, oldest first).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_on_capacity_increase()
RETURNS TRIGGER AS $$
DECLARE
    v_confirmed_count INTEGER;
    v_spots_available INTEGER;
BEGIN
    -- Only run if capacity increased
    IF NEW.capacity_limit > OLD.capacity_limit THEN
        
        -- Get current confirmed count for this specific day
        SELECT COUNT(*) INTO v_confirmed_count
        FROM public.bookings
        WHERE day_id = NEW.date AND status = 'confirmed';

        -- Calculate how many new spots should be available
        -- Note: We use capacity - confirmed, not just the difference (new - old),
        -- in case there were already open spots that weren't filled for some reason.
        v_spots_available := NEW.capacity_limit - v_confirmed_count;

        IF v_spots_available > 0 THEN
            -- Promote the oldest waitlisted bookings to fill the new spots.
            -- Using a subquery with LIMIT ensures we don't promote more than we have room for.
            UPDATE public.bookings
            SET status = 'confirmed',
                updated_at = NOW()
            WHERE id IN (
                SELECT id
                FROM public.bookings
                WHERE day_id = NEW.date AND status = 'waitlist'
                ORDER BY created_at ASC
                LIMIT v_spots_available
                FOR UPDATE SKIP LOCKED
            );
            
            -- Logging helpful for debugging
            RAISE NOTICE 'Capacity increased for %. Promoting up to % bookings.', NEW.date, v_spots_available;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Attach to days table
-- Fires AFTER UPDATE on capacity_limit column
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_promote_on_capacity_increase ON public.days;
CREATE TRIGGER trigger_promote_on_capacity_increase
    AFTER UPDATE OF capacity_limit ON public.days
    FOR EACH ROW
    EXECUTE FUNCTION public.promote_on_capacity_increase();
