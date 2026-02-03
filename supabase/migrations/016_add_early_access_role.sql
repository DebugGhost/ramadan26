-- Migration to add 'early_access' role and grant it to specific users

-- 1. Drop the existing check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add the new check constraint including 'early_access'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'volunteer', 'admin', 'early_access'));

-- 3. Update the role for the specified users
UPDATE public.profiles
SET role = 'early_access'
WHERE email IN (
    'analkhat@ualberta.ca', 
    'amalshar@ualberta.ca', 
    'aburok@ualberta.ca',
    'habusham@ualberta.ca', 
    'salous@ualberta.ca', 
    'lsaker@ualberta.ca',
    'nnalkhat@ualberta.ca', 
    'alshari1@ualberta.ca', 
    'kishawi@ualberta.ca',
    'alsaafin@ualberta.ca', 
    'osaadedd@ualberta.ca', 
    'firwana@ualberta.ca',
    'saedam@ualberta.ca', 
    'szidan@ualberta.ca', 
    'sabughos@ualberta.ca',
    'barbakh@ualberta.ca', 
    'mitwasi@ualberta.ca'
);

-- Optional: Verify the update
-- SELECT email, role FROM public.profiles WHERE role = 'early_access';
