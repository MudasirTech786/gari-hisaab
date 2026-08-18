-- ============================================================
-- Gari Hisaab - Designate Initial Platform Admin
-- ============================================================
-- This migration:
-- 1. Adds 'platform_admin' and 'customer' to profile_role enum
-- 2. Designates m.mudasirasfi@gmail.com as platform_admin
-- 3. Updates existing profiles to use 'customer' role
-- ============================================================

-- ============================================================
-- 1. Extend profile_role enum with new values
-- ============================================================
-- Add 'platform_admin' and 'customer' to the existing enum.
-- ADD VALUE IF NOT EXISTS is safe for PostgreSQL enums.
-- ============================================================
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

-- ============================================================
-- 2. Designate the initial Platform Admin
-- ============================================================
-- Locate the Supabase Auth user by email, resolve their
-- profile via profiles.user_id = auth.users.id, and
-- set them as platform_admin.
--
-- This email is used ONLY during initial setup.
-- After this, authorization relies on the database role.
-- ============================================================
UPDATE public.profiles
SET
  is_platform_admin = true,
  role = 'platform_admin'::public.profile_role,
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'm.mudasirasfi@gmail.com'
  LIMIT 1
);

-- ============================================================
-- 3. Update existing customer profiles
-- ============================================================
-- All other existing profiles that are not the platform admin
-- should have role = 'customer'. This ensures the enum is
-- properly used going forward.
-- ============================================================
UPDATE public.profiles
SET
  role = 'customer'::public.profile_role,
  updated_at = now()
WHERE is_platform_admin = false
  AND role NOT IN ('customer'::public.profile_role);

-- ============================================================
-- 4. Update the handle_new_user trigger default
-- ============================================================
-- New users created by the admin provisioning flow should
-- get role = 'customer' by default (not 'owner').
-- The trigger already handles this via raw_user_meta_data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with role from metadata, defaulting to 'customer'
  -- Platform Admin provisions customers, so the default should be 'customer'
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

  -- Only auto-create workspace if user_metadata has 'create_workspace: true'
  -- This allows Platform Admin to control whether a workspace is created
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
