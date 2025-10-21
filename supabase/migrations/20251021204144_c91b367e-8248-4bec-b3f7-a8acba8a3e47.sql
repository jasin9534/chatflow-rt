-- Fix public profile exposure by requiring authentication
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add message length constraint to prevent storage abuse
ALTER TABLE public.messages 
  ADD CONSTRAINT message_length_check 
  CHECK (length(content) > 0 AND length(content) <= 5000);