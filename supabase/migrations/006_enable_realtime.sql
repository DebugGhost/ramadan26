-- Enable Realtime for the bookings table
-- This allows multiple volunteers to see check-in updates in real-time
-- and users to see their booking status update instantly

-- Add the bookings table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Optionally, also enable for days table (for real-time capacity updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.days;
