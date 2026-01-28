-- Migration 014: Add Donations Table
-- Tracks donation history

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional linking to user
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    payment_id TEXT NOT NULL, -- Square Payment ID
    status TEXT NOT NULL, -- COMPLETED, FAILED, etc.
    email TEXT, -- Capture email even if guest
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own donations
CREATE POLICY "Users can view own donations" ON public.donations
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations" ON public.donations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Anyone (server) can insert (handled via service role in API, but good to have explicit policy if expanding later)
-- For now, we rely on the server-side API using service role to insert, so no public INSERT policy is strictly needed if we don't allow direct client inserts.
