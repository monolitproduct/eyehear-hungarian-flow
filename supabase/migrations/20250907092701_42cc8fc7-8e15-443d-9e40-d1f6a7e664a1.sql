-- =====================================================
-- RLS POLICY OPTIMIZATION: Wrap auth.uid() in subselects
-- to evaluate once per statement instead of per row
-- =====================================================

-- 1. TRANSCRIPTS TABLE POLICIES
-- ==============================

-- Policy: "Users can view their own transcripts" (SELECT)
-- Original: USING (auth.uid() = user_id)
-- Optimized: USING ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can view their own transcripts" 
ON public.transcripts 
TO authenticated 
USING ((SELECT auth.uid()) = user_id);

-- Policy: "Users can create their own transcripts" (INSERT)  
-- Original: WITH CHECK (auth.uid() = user_id)
-- Optimized: WITH CHECK ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can create their own transcripts"
ON public.transcripts
TO authenticated 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: "Users can update their own transcripts" (UPDATE)
-- Original: USING (auth.uid() = user_id) 
-- Optimized: USING ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can update their own transcripts"
ON public.transcripts
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy: "Users can delete their own transcripts" (DELETE)
-- Original: USING (auth.uid() = user_id)
-- Optimized: USING ((SELECT auth.uid()) = user_id) 
ALTER POLICY "Users can delete their own transcripts"
ON public.transcripts
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 2. PROFILES TABLE POLICIES  
-- ===========================

-- Policy: "Users can view their own profile" (SELECT)
-- Original: USING (auth.uid() = user_id)
-- Optimized: USING ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can view their own profile"
ON public.profiles
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy: "Users can create their own profile" (INSERT)
-- Original: WITH CHECK (auth.uid() = user_id) 
-- Optimized: WITH CHECK ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can create their own profile"
ON public.profiles
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: "Users can update their own profile" (UPDATE)
-- Original: USING (auth.uid() = user_id)
-- Optimized: USING ((SELECT auth.uid()) = user_id)
ALTER POLICY "Users can update their own profile"
ON public.profiles  
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 3. INDEX OPTIMIZATION
-- =====================

-- Create index on transcripts.user_id for efficient RLS filtering
-- (Note: profiles already has unique index on user_id and id via existing constraints)
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);

-- =====================================================
-- VERIFICATION QUERIES (for manual testing after migration)
-- =====================================================

-- Test query to verify auth.uid() is evaluated once per statement:
-- EXPLAIN SELECT * FROM public.transcripts WHERE user_id = (SELECT auth.uid());

-- Expected EXPLAIN output should show:
-- - InitPlan or SubPlan for auth.uid() evaluation  
-- - Index scan on idx_transcripts_user_id
-- - Single evaluation of auth function, not per-row

-- Test query for profiles:
-- EXPLAIN SELECT * FROM public.profiles WHERE user_id = (SELECT auth.uid());

-- Expected EXPLAIN output should show:
-- - InitPlan or SubPlan for auth.uid() evaluation
-- - Index scan on profiles_user_id_key (existing unique constraint)
-- - Single evaluation of auth function, not per-row