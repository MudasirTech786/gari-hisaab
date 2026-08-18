-- ============================================================
-- Gari Hisaab - Multi-Tenant Workspace Architecture
-- ============================================================
-- This migration transforms the single-owner model into a
-- multi-tenant SaaS architecture with workspaces.
-- 
-- SAFETY: This migration is additive. It does NOT drop any
-- existing tables, columns, or data. It adds new tables,
-- new columns (nullable initially), new RLS policies, and
-- migrates existing owner data into workspaces.
-- ============================================================

-- ============================================================
-- 1. New enum type: workspace_member_role
-- ============================================================
DO $$ BEGIN
  CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'manager', 'driver', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. New enum types for future tables
-- ============================================================
DO $$ BEGIN
  CREATE TYPE maintenance_type AS ENUM ('oil_change', 'brake', 'tyres', 'battery', 'engine', 'ac', 'repair', 'service', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_document_type AS ENUM ('registration', 'insurance', 'token_tax', 'fitness', 'permit', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Table: workspaces
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view workspaces they are members of
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS: Only workspace owner can update workspace
DROP POLICY IF EXISTS "Owner can update workspace" ON public.workspaces;
CREATE POLICY "Owner can update workspace"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- RLS: Only authenticated users can insert workspaces (they become owner)
DROP POLICY IF EXISTS "Authenticated can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated can create workspace"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- RLS: Only workspace owner can delete workspace
DROP POLICY IF EXISTS "Owner can delete workspace" ON public.workspaces;
CREATE POLICY "Owner can delete workspace"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Table: workspace_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_member_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_workspace_user_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view members of workspaces they belong to
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS: Workspace owners/admins can manage members
DROP POLICY IF EXISTS "Owner can manage workspace members" ON public.workspace_members;
CREATE POLICY "Owner can manage workspace members"
  ON public.workspace_members FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
    )
  );

DROP TRIGGER IF EXISTS set_workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER set_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Add workspace_id to existing tenant-owned tables
-- ============================================================
-- These columns are added as NULLABLE initially.
-- The data migration function below will populate them.

-- cars
DO $$ BEGIN
  ALTER TABLE public.cars ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- drivers
DO $$ BEGIN
  ALTER TABLE public.drivers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- daily_records
DO $$ BEGIN
  ALTER TABLE public.daily_records ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- expenses
DO $$ BEGIN
  ALTER TABLE public.expenses ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- earnings
DO $$ BEGIN
  ALTER TABLE public.earnings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 6. Indexes on new workspace_id columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cars_workspace_id ON public.cars(workspace_id);
CREATE INDEX IF NOT EXISTS idx_drivers_workspace_id ON public.drivers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_workspace_id ON public.daily_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON public.expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_earnings_workspace_id ON public.earnings(workspace_id);

-- ============================================================
-- 7. Table: driver_vehicle_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dva_workspace_id ON public.driver_vehicle_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dva_driver_id ON public.driver_vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_dva_vehicle_id ON public.driver_vehicle_assignments(vehicle_id);

ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage assignments" ON public.driver_vehicle_assignments;
CREATE POLICY "Members can manage assignments"
  ON public.driver_vehicle_assignments FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_dva_updated_at ON public.driver_vehicle_assignments;
CREATE TRIGGER set_dva_updated_at
  BEFORE UPDATE ON public.driver_vehicle_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. Table: fuel_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  litres NUMERIC NOT NULL CHECK (litres > 0),
  price_per_litre NUMERIC NOT NULL CHECK (price_per_litre > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  odometer NUMERIC,
  station TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_workspace_id ON public.fuel_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON public.fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON public.fuel_records(date);

ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage fuel records" ON public.fuel_records;
CREATE POLICY "Members can manage fuel records"
  ON public.fuel_records FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. Table: maintenance_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type maintenance_type NOT NULL,
  description TEXT,
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  odometer NUMERIC,
  workshop TEXT,
  next_service_date DATE,
  next_service_odometer NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_workspace_id ON public.maintenance_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON public.maintenance_records(date);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage maintenance records" ON public.maintenance_records;
CREATE POLICY "Members can manage maintenance records"
  ON public.maintenance_records FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_maintenance_updated_at ON public.maintenance_records;
CREATE TRIGGER set_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10. Table: vehicle_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  document_type vehicle_document_type NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vd_workspace_id ON public.vehicle_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vd_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vd_expiry_date ON public.vehicle_documents(expiry_date);

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage vehicle documents" ON public.vehicle_documents;
CREATE POLICY "Members can manage vehicle documents"
  ON public.vehicle_documents FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_vd_updated_at ON public.vehicle_documents;
CREATE TRIGGER set_vd_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 11. Update existing RLS policies for workspace-based access
-- ============================================================
-- We replace the owner_id-based policies with workspace-based policies.
-- The old owner_id policies are dropped and replaced.

-- CARS: workspace-based RLS
DROP POLICY IF EXISTS "Users can view own cars" ON public.cars;
DROP POLICY IF EXISTS "Users can insert own cars" ON public.cars;
DROP POLICY IF EXISTS "Users can update own cars" ON public.cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON public.cars;

CREATE POLICY "Members can view cars"
  ON public.cars FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert cars"
  ON public.cars FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update cars"
  ON public.cars FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete cars"
  ON public.cars FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- DRIVERS: workspace-based RLS
DROP POLICY IF EXISTS "Users can view own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can insert own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can update own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can delete own drivers" ON public.drivers;

CREATE POLICY "Members can view drivers"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert drivers"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update drivers"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete drivers"
  ON public.drivers FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- DAILY_RECORDS: workspace-based RLS
DROP POLICY IF EXISTS "Users can view own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can insert own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can update own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can delete own daily records" ON public.daily_records;

CREATE POLICY "Members can view daily records"
  ON public.daily_records FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert daily records"
  ON public.daily_records FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update daily records"
  ON public.daily_records FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete daily records"
  ON public.daily_records FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- EXPENSES: workspace-based RLS
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Members can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- EARNINGS: workspace-based RLS
DROP POLICY IF EXISTS "Users can view own earnings" ON public.earnings;
DROP POLICY IF EXISTS "Users can insert own earnings" ON public.earnings;
DROP POLICY IF EXISTS "Users can update own earnings" ON public.earnings;
DROP POLICY IF EXISTS "Users can delete own earnings" ON public.earnings;

CREATE POLICY "Members can view earnings"
  ON public.earnings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert earnings"
  ON public.earnings FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update earnings"
  ON public.earnings FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete earnings"
  ON public.earnings FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 12. Function: migrate existing owner data to workspace
-- ============================================================
-- For each unique owner_id in cars/drivers/daily_records/expenses/earnings,
-- create a workspace and add the owner as a member.
-- Then link all their existing records to the workspace.

CREATE OR REPLACE FUNCTION public.migrate_owner_to_workspace(p_owner_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_workspace_name TEXT;
  v_slug TEXT;
  v_profile_name TEXT;
BEGIN
  -- Check if owner already has a workspace
  SELECT w.id INTO v_workspace_id
  FROM public.workspaces w
  WHERE w.owner_id = p_owner_id
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    RETURN v_workspace_id;
  END IF;

  -- Get profile name for workspace name
  SELECT COALESCE(p.full_name, 'My Fleet') INTO v_profile_name
  FROM public.profiles p
  WHERE p.user_id = p_owner_id;

  v_workspace_name := v_profile_name || '''s Fleet';
  v_slug := LOWER(REGEXP_REPLACE(v_profile_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(p_owner_id::TEXT, 1, 8);

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_workspace_name, v_slug, p_owner_id)
  RETURNING id INTO v_workspace_id;

  -- Add owner as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_owner_id, 'owner');

  -- Link existing cars
  UPDATE public.cars SET workspace_id = v_workspace_id WHERE owner_id = p_owner_id AND workspace_id IS NULL;

  -- Link existing drivers
  UPDATE public.drivers SET workspace_id = v_workspace_id WHERE owner_id = p_owner_id AND workspace_id IS NULL;

  -- Link existing daily_records
  UPDATE public.daily_records SET workspace_id = v_workspace_id WHERE owner_id = p_owner_id AND workspace_id IS NULL;

  -- Link existing expenses
  UPDATE public.expenses SET workspace_id = v_workspace_id WHERE owner_id = p_owner_id AND workspace_id IS NULL;

  -- Link existing earnings
  UPDATE public.earnings SET workspace_id = v_workspace_id WHERE owner_id = p_owner_id AND workspace_id IS NULL;

  RETURN v_workspace_id;
END;
$$;

-- ============================================================
-- 13. Auto-create workspace for new user signup
-- ============================================================
-- Update the handle_new_user trigger to also create a workspace

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_workspace_id UUID;
  v_slug TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (NEW.id, v_full_name, NEW.email, 'owner')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create workspace for new user
  v_slug := LOWER(REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_full_name || '''s Fleet', v_slug, NEW.id)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_workspace_id;

  -- Add as owner member
  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 14. Run data migration for existing owners
-- ============================================================
-- Migrate all existing owner_id data into workspaces

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT owner_id FROM (
      SELECT owner_id FROM public.cars
      UNION
      SELECT owner_id FROM public.drivers
      UNION
      SELECT owner_id FROM public.daily_records
      UNION
      SELECT owner_id FROM public.expenses
      UNION
      SELECT owner_id FROM public.earnings
    ) all_owners
    WHERE owner_id IS NOT NULL
  LOOP
    PERFORM public.migrate_owner_to_workspace(r.owner_id);
  END LOOP;
END $$;

-- Also migrate users who have profiles but no data yet
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.workspaces w ON w.owner_id = p.user_id
    WHERE w.id IS NULL
  LOOP
    PERFORM public.migrate_owner_to_workspace(r.user_id);
  END LOOP;
END $$;

-- ============================================================
-- 15. GRANT new tables to authenticated role
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.workspaces, public.workspace_members,
   public.driver_vehicle_assignments,
   public.fuel_records, public.maintenance_records,
   public.vehicle_documents
TO authenticated;

-- ============================================================
-- 16. Helper function: get current user's default workspace
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = auth.uid()
  ORDER BY wm.created_at ASC
  LIMIT 1;

  RETURN v_workspace_id;
END;
$$;

-- ============================================================
-- 17. Helper function: check if user is workspace member
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = auth.uid()
  );
END;
$$;

-- ============================================================
-- 18. Helper function: get workspace member role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS workspace_member_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role workspace_member_role;
BEGIN
  SELECT wm.role INTO v_role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
  AND wm.user_id = auth.uid();

  RETURN v_role;
END;
$$;
