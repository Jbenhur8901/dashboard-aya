-- Automatic User Profile Creation
-- This trigger creates a profile in public.users when a new auth.users record is created

-- Function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    username,
    role,
    approved,
    disabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1), -- Générer un username temporaire depuis l'email
    'user', -- Rôle par défaut
    true, -- Par défaut, les utilisateurs sont approuvés (accès immédiat)
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Manually create an admin user profile (adjust email to match your auth user)
-- Run this after creating your admin user in Supabase Auth
/*
UPDATE public.users
SET
  role = 'admin',
  approved = true,
  full_name = 'Administrateur',
  fonction = 'Administrateur Système'
WHERE email = 'admin@assurdash.com';
*/
