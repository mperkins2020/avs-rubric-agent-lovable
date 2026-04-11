-- Allow null emails for anonymous users
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Update trigger to handle anonymous users with null email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, NULL));
  RETURN NEW;
END;
$$;