-- Create a table for early access emails
CREATE TABLE IF NOT EXISTS public.early_access_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.early_access_emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (so they can check if they are in it)
CREATE POLICY "Allow authenticated read" ON public.early_access_emails
    FOR SELECT TO authenticated USING (true);

-- Insert the allowed emails
INSERT INTO public.early_access_emails (email) VALUES 
('analkhat@ualberta.ca'), 
('amalshar@ualberta.ca'), 
('aburok@ualberta.ca'),
('habusham@ualberta.ca'),
('salous@ualberta.ca'),
('lsaker@ualberta.ca'),
('nnalkhat@ualberta.ca'),
('alshari1@ualberta.ca'),
('kishawi@ualberta.ca'),
('alsaafin@ualberta.ca'),
('osaadedd@ualberta.ca'),
('firwana@ualberta.ca'),
('saedam@ualberta.ca'),
('szidan@ualberta.ca'), 
('sabughos@ualberta.ca'),
('barbakh@ualberta.ca'),
('mitwasi@ualberta.ca')
ON CONFLICT (email) DO NOTHING;
