-- Migration 011: Add User Details
-- Adds gender and referral_source to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('brother', 'sister')),
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Index for analytics if needed later
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
