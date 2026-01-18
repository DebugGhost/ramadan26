-- Migration 001: Core Schema
-- Creates the profiles, days, and bookings tables with proper relationships and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extends auth.users with MSA-specific fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'volunteer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- DAYS TABLE
-- One row per Ramadan day, controls capacity and availability
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.days (
    date DATE PRIMARY KEY,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    capacity_limit INTEGER NOT NULL DEFAULT 235,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BOOKINGS TABLE
-- Stores all reservation records with status tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_id DATE NOT NULL REFERENCES public.days(date) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    
    -- Prevent duplicate bookings (user can only have one active booking per day)
    UNIQUE(user_id, day_id)
);

-- Index for checking capacity (critical for reserve_spot function)
CREATE INDEX IF NOT EXISTS idx_bookings_day_status_created 
    ON public.bookings(day_id, status, created_at);

-- Index for user lookup (for dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
    ON public.bookings(user_id);

-- Index for volunteer kiosk (today's confirmed bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_day_status_checked 
    ON public.bookings(day_id, status, checked_in);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at column on row changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_days
    BEFORE UPDATE ON public.days
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_bookings
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
