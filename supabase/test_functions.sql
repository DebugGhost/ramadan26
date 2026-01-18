-- Test the reserve_spot function to ensure race conditions are handled properly
-- Run this AFTER migrations and seeding

-- Test Setup: Create test day and users
DO $$
DECLARE
    test_date DATE := '2026-03-15';
BEGIN
    -- Ensure test day exists
    INSERT INTO public.days (date, is_open, capacity_limit)
    VALUES (test_date, true, 5) -- Small capacity for easier testing
    ON CONFLICT (date) DO UPDATE SET capacity_limit = 5, is_open = true;
    
    RAISE NOTICE 'Test day created: %', test_date;
END $$;

-- ============================================================================
-- TEST 1: Basic Reservation
-- ============================================================================
-- This should return 'CONFIRMED' (assuming you're authenticated)
SELECT public.reserve_spot('2026-03-15');

-- Check the booking was created
SELECT id, status, created_at FROM public.bookings WHERE day_id = '2026-03-15';

-- ============================================================================
-- TEST 2: Duplicate Booking Prevention
-- ============================================================================
-- Try to book the same day again - should return 'ALREADY_BOOKED'
SELECT public.reserve_spot('2026-03-15');

-- ============================================================================
-- TEST 3: Waitlist Functionality
-- ============================================================================
-- To properly test, you'd need to create 5 confirmed bookings first
-- Then the 6th booking should return 'WAITLISTED'

-- Check current capacity
SELECT 
    day_id,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE status = 'waitlist') as waitlist_count
FROM public.bookings
WHERE day_id = '2026-03-15'
GROUP BY day_id;

-- ============================================================================
-- TEST 4: Waitlist Auto-Promotion
-- ============================================================================
-- First, get a booking to cancel
SELECT id, status FROM public.bookings 
WHERE day_id = '2026-03-15' AND status = 'confirmed' 
LIMIT 1;

-- Cancel it (replace <booking_id> with actual ID from above)
-- UPDATE public.bookings SET status = 'cancelled' WHERE id = '<booking_id>';

-- Check if oldest waitlisted user was promoted to confirmed
SELECT id, status, created_at 
FROM public.bookings 
WHERE day_id = '2026-03-15' 
ORDER BY created_at ASC;

-- ============================================================================
-- TEST 5: Closed Day
-- ============================================================================
UPDATE public.days SET is_open = false WHERE date = '2026-03-15';

-- Try to book - should return 'DAY_CLOSED'
SELECT public.reserve_spot('2026-03-15');

-- Re-open the day
UPDATE public.days SET is_open = true WHERE date = '2026-03-15';

-- ============================================================================
-- CLEANUP
-- ============================================================================
-- Remove test data
-- DELETE FROM public.bookings WHERE day_id = '2026-03-15';
-- DELETE FROM public.days WHERE date = '2026-03-15';
