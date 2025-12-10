-- Enable RLS on all tables to secure them from public access
-- Run this in the Supabase SQL Editor

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No policies are added. This implicitly denies all access via the public Supabase API
-- while allowing the Node.js backend (which connects as an administrator/service role) to continue functioning.
