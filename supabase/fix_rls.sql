-- ==============================================================================
-- Quick Fix for: "new row violates row-level security policy for table 'registrations'"
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (e.g. ofltdenhtlpykwjbqmwl)
-- 3. Click on "SQL Editor" in the left sidebar
-- 4. Paste this entire script and click "Run" (green button)
-- ==============================================================================

-- 1. Ensure table has RLS enabled
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous / restrictive insert policies
DROP POLICY IF EXISTS "Allow public registration insert" ON public.registrations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.registrations;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.registrations;
DROP POLICY IF EXISTS "Enable insert for users" ON public.registrations;

-- 3. Grant INSERT permission to anonymous (public) and authenticated visitors
CREATE POLICY "Allow public registration insert"
ON public.registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Drop any restrictive select policies
DROP POLICY IF EXISTS "Allow public registration read" ON public.registrations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.registrations;

-- 5. Grant SELECT permission to anonymous and authenticated visitors
CREATE POLICY "Allow public registration read"
ON public.registrations
FOR SELECT
TO anon, authenticated
USING (true);

-- ==============================================================================
-- Verification query (optional):
-- Check active policies on the table:
-- ==============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registrations';
