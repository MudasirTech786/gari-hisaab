-- ============================================================
-- Gari Hisaab - Ensure Platform Admin Role
-- ============================================================
-- Idempotent migration to guarantee the platform admin account
-- has is_platform_admin = true and role = 'platform_admin'.
--
-- Safe to run multiple times.
-- ============================================================

-- 1. Ensure the enum values exist
DO $$ BEGIN
  ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'platform_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'customer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Designate the platform admin account by email
--    This is the ONLY time email is used for identification.
UPDATE public.profiles
SET
  is_platform_admin = true,
  role = 'platform_admin'::public.profile_role,
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'm.mudasirasfi@gmail.com'
  LIMIT 1
)
AND (
  is_platform_admin = false
  OR role != 'platform_admin'::public.profile_role
);

-- 3. Create the profile if it doesn't exist yet
--    (for the case where the user exists in auth.users but has no profile)
INSERT INTO public.profiles (user_id, full_name, email, role, is_platform_admin)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name',
    split_part(au.email, '@', 1)
  ),
  au.email,
  'platform_admin'::public.profile_role,
  true
FROM auth.users au
WHERE au.email = 'm.mudasirasfi@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);

-- 4. Ensure handle_new_user trigger defaults new users to customer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, is_platform_admin)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::profile_role, 'customer'),
    COALESCE((NEW.raw_user_meta_data ->> 'is_platform_admin')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF (NEW.raw_user_meta_data ->> 'create_workspace') = 'true' THEN
    DECLARE
      v_full_name TEXT;
      v_slug TEXT;
      v_workspace_id UUID;
    BEGIN
      v_full_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        split_part(NEW.email, '@', 1)
      );
      v_slug := LOWER(REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

      INSERT INTO public.workspaces (name, slug, owner_id, status)
      VALUES (v_full_name || '''s Fleet', v_slug, NEW.id, 'active')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id INTO v_workspace_id;

      IF v_workspace_id IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (v_workspace_id, NEW.id, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;
