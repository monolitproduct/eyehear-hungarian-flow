-- First, clean up any existing transcripts without user_id (orphaned data)
DELETE FROM public.transcripts WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent data exposure
ALTER TABLE public.transcripts ALTER COLUMN user_id SET NOT NULL;

-- Secure the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Secure the handle_new_user function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$function$;