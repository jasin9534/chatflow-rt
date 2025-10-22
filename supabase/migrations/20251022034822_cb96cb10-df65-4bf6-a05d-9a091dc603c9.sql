-- Fix infinite recursion in RLS policies by using security definer function

-- Create a security definer function to check room membership
-- This breaks the recursion by executing the check outside the RLS context
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_room_members
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view room members" ON public.chat_room_members;
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.chat_rooms;

-- Create new policies using the security definer function
CREATE POLICY "Users can view room members"
ON public.chat_room_members FOR SELECT
USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Users can view rooms they are members of"
ON public.chat_rooms FOR SELECT
USING (public.is_room_member(id, auth.uid()));