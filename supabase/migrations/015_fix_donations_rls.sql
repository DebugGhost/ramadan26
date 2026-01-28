-- Migration 015: Fix RLS for Donations
-- Need to allow inserts from the public API route

CREATE POLICY "Enable insert for everyone" ON public.donations 
FOR INSERT 
WITH CHECK (true);
