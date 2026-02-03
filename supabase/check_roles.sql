-- Check the structure of the profiles table, specifically the role constraint/type
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check if there is a constraint on the role column
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c 
JOIN pg_namespace n ON n.oid = c.connamespace 
WHERE conrelid = 'public.profiles'::regclass;

-- Check if any of these users already exist and their current roles
SELECT email, role 
FROM profiles 
WHERE email IN (
    'analkhat@ualberta.ca', 'amalshar@ualberta.ca', 'aburok@ualberta.ca',
    'habusham@ualberta.ca', 'salous@ualberta.ca', 'lsaker@ualberta.ca',
    'nnalkhat@ualberta.ca', 'alshari1@ualberta.ca', 'kishawi@ualberta.ca',
    'alsaafin@ualberta.ca', 'osaadedd@ualberta.ca', 'firwana@ualberta.ca',
    'saedam@ualberta.ca', 'szidan@ualberta.ca', 'sabughos@ualberta.ca',
    'barbakh@ualberta.ca', 'mitwasi@ualberta.ca'
);
