-- Seed UAlberta MSA Iftar Dates 2026 (Weekdays Only)
-- Run this AFTER running all migrations
-- Total: 22 serving days (excluding weekends)

INSERT INTO public.days (date, is_open, capacity_limit) VALUES
    -- Week 1: Feb 18-20 (Wed-Fri)
    ('2026-02-18', true, 235),
    ('2026-02-19', true, 235),
    ('2026-02-20', true, 235),
    
    -- Week 2: Feb 23-27 (Mon-Fri)
    ('2026-02-23', true, 235),
    ('2026-02-24', true, 235),
    ('2026-02-25', true, 235),
    ('2026-02-26', true, 235),
    ('2026-02-27', true, 235),
    
    -- Week 3: Mar 2-6 (Mon-Fri)
    ('2026-03-02', true, 235),
    ('2026-03-03', true, 235),
    ('2026-03-04', true, 235),
    ('2026-03-05', true, 235),
    ('2026-03-06', true, 235),
    
    -- Week 4: Mar 9-13 (Mon-Fri)
    ('2026-03-09', true, 235),
    ('2026-03-10', true, 235),
    ('2026-03-11', true, 235),
    ('2026-03-12', true, 235),
    ('2026-03-13', true, 235),
    
    -- Week 5: Mar 16-18 (Mon-Wed)
    ('2026-03-16', true, 235),
    ('2026-03-17', true, 235),
    ('2026-03-18', true, 235)
ON CONFLICT (date) DO NOTHING;

-- Verify the data was inserted
SELECT * FROM public.days ORDER BY date ASC;
