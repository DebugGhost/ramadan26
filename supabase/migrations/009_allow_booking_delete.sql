-- Migration: Allow users to DELETE their own bookings
-- This is required because we switched from marking as 'cancelled' to deleting the row

CREATE POLICY "Users can delete own bookings"
    ON public.bookings
    FOR DELETE
    USING (auth.uid() = user_id);
