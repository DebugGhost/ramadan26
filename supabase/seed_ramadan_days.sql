-- Seed UAlberta MSA Iftar Dates 2026 (Weekdays Only)
-- Run this AFTER running all migrations (including 017_add_menu_column.sql)
-- Total: 21 serving days (excluding weekends)
-- Capacities: Original values minus 9, Waitlist: 50

-- Clear existing days first (use with caution!)
DELETE FROM public.days;

INSERT INTO public.days (date, is_open, capacity_limit, menu_item) VALUES
    -- Week 1: Feb 18-20 (Wed-Fri) - Capacity 150 - 9 = 141
    ('2026-02-18', true, 141, 'Chicken Biryani (Biryani Box)'),
    ('2026-02-19', true, 141, 'White sauce chicken pasta (Rehman''s Kitchen)'),
    ('2026-02-20', true, 141, 'Biryani (Shariq''s Kitchen)'),
    
    -- Week 2: Feb 23-27 (Mon-Fri) - Capacity 250 - 9 = 241
    ('2026-02-23', true, 241, 'Butter Chicken with rice and naan (Shariq''s Kitchen)'),
    ('2026-02-24', true, 241, 'Meatballs with pasta and dates (Taybah Cuisine)'),
    ('2026-02-25', true, 241, 'NON-MUSLIMS Iftaar - 50 veg + 200 non-veg (Satay Madura)'),
    ('2026-02-26', true, 241, 'Chicken Biryani (Biryani Box)'),
    ('2026-02-27', true, 241, 'Red sauce pasta (Rehman''s Kitchen)'),
    
    -- Week 3: Mar 2-6 (Mon-Fri) - Capacity 250 - 9 = 241
    ('2026-03-02', true, 241, 'Home cooked meal (Aml''s Mom is cooking)'),
    ('2026-03-03', true, 241, 'Chicken Barbeque with veggie rice, sauce and dates (Taybah Cuisine)'),
    ('2026-03-04', true, 241, 'Chicken Biryani (Biryani Box)'),
    ('2026-03-05', true, 241, 'White sauce chicken pasta (Rehman''s Kitchen)'),
    ('2026-03-06', true, 241, 'Chicken Biryani - possible call out (Rehman''s Kitchen)'),
    
    -- Week 4: Mar 9-13 (Mon-Fri)
    ('2026-03-09', true, 241, 'POTLUCK: Fish (Shafii Grill) + Manakeesh (Sunbake) + Pizza'),
    ('2026-03-10', true, 241, 'Chicken sauce with sauce and dates (Taybah Cuisine)'),
    ('2026-03-11', true, 241, 'Chicken Stir Fry + risol (Satay Madura)'),
    ('2026-03-12', true, 241, 'Red sauce pasta (Rehman''s Kitchen)'),
    ('2026-03-13', true, 241, 'Butter Chicken (Shariq''s Kitchen)'),
    
    -- Week 5: Mar 16-18 (Mon-Wed) - Capacity 250 - 9 = 241
    ('2026-03-16', true, 241, 'Chicken Biryani (Rehman''s Kitchen)'),
    ('2026-03-17', true, 241, 'Chicken Kebab with baked potatoes and samosas and dates (Taybah Cuisine)'),
    ('2026-03-18', true, 241, NULL)  -- No menu set yet
ON CONFLICT (date) DO UPDATE SET 
    capacity_limit = EXCLUDED.capacity_limit,
    menu_item = EXCLUDED.menu_item,
    is_open = EXCLUDED.is_open;

-- Verify the data was inserted
SELECT date, capacity_limit, menu_item FROM public.days ORDER BY date ASC;
