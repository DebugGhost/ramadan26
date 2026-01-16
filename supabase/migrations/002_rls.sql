-- Migration 002: Row Level Security Policies
-- Ensures users can only access their own data, while service role has full access

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Service role (volunteer API) has full access
CREATE POLICY "Service role has full access to profiles"
    ON public.profiles
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- DAYS TABLE POLICIES
-- ============================================================================

-- All authenticated users can read days (to see capacity and availability)
CREATE POLICY "Authenticated users can read days"
    ON public.days
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role can insert/update days
CREATE POLICY "Service role has full access to days"
    ON public.days
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- BOOKINGS TABLE POLICIES
-- ============================================================================

-- Users can read ONLY their own bookings
CREATE POLICY "Users can read own bookings"
    ON public.bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert bookings (capacity is checked by reserve_spot function)
CREATE POLICY "Users can insert own bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update ONLY their own bookings to 'cancelled'
-- This prevents users from changing status to 'confirmed' or 'waitlist' directly
CREATE POLICY "Users can cancel own bookings"
    ON public.bookings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'cancelled'
    );

-- Service role (volunteer kiosk) has full access to update check-in status
CREATE POLICY "Service role has full access to bookings"
    ON public.bookings
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
