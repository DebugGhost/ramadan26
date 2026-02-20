-- Get emails of people who confirmed for today (Feb 18, 2026) but haven't checked in yet
SELECT 
    p.email, 
    p.full_name,
    b.status,
    b.checked_in
FROM 
    public.bookings b
JOIN 
    public.profiles p ON b.user_id = p.id
WHERE 
    b.day_id = '2026-02-18'       -- Target today's date
    AND b.status = 'confirmed'    -- Only confirmed bookings
    AND b.checked_in = false;     -- Who have NOT checked in
