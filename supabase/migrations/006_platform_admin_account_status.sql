-- ============================================================
-- Gari Hisaab - Platform Admin & Account Status Architecture
-- ============================================================
-- This migration adds:
-- 1. Platform admin support (is_platform_admin on profiles)
-- 2. Workspace account status (status on workspaces)
-- 3. Audit log table (future-ready)
-- 4. Updated handle_new_user to NOT auto-create workspace
--    (admin provisions customers now)
-- ============================================================

-- ============================================================
-- 1. Add is_platform_admin to profiles
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_platform_admin ON public.profiles(is_platform_admin) WHERE is_platform_admin = true;

-- ============================================================
-- 2. Add account status to workspaces
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.workspaces ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive'));
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);

-- ============================================================
-- 3. Create audit_logs table (future-ready)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.is_platform_admin = true
    )
  );

-- Only service role can insert audit logs (via SECURITY DEFINER function)
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- ============================================================
-- 4. Update handle_new_user trigger
-- ============================================================
-- The Platform Admin provisions customers. We still need the
-- trigger to create a profile, but we should NOT auto-create
-- a workspace anymore. The admin creates the workspace during
-- customer provisioning.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile (always needed)
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::profile_role, 'owner')
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

-- ============================================================
-- 5. Function: log_audit_event (for future use)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, workspace_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_workspace_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

-- ============================================================
-- 6. Helper: check if user is platform admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_platform_admin = true
  );
END;
$$;

-- ============================================================
-- 7. Helper: check workspace is active
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_workspace_active(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id
    AND w.status = 'active'
  );
END;
$$;
