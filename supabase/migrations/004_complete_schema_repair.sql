-- ============================================================
-- Gari Hisaab - Complete Schema Repair
-- ============================================================
-- This migration creates all objects missing from the database
-- while preserving the existing profiles table and its data.
-- Safe to run multiple times (fully idempotent).
-- ============================================================

-- ============================================================
-- 1. Custom enum types
-- ============================================================
DO $$ BEGIN
  CREATE TYPE profile_role AS ENUM ('owner', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'oil', 'tire', 'parking', 'toll', 'car_wash', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE earning_source AS ENUM ('indrive', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Function: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Table: profiles (preserved, not recreated)
-- ============================================================
-- Profiles already exists. Ensure RLS is enabled, policies are
-- correct, index exists, and trigger is attached.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Table: cars
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  make TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INTEGER,
  current_km NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cars_year_check CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
  CONSTRAINT cars_current_km_check CHECK (current_km >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON public.cars(owner_id);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cars" ON public.cars;
CREATE POLICY "Users can view own cars"
  ON public.cars FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cars" ON public.cars;
CREATE POLICY "Users can insert own cars"
  ON public.cars FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cars" ON public.cars;
CREATE POLICY "Users can update own cars"
  ON public.cars FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own cars" ON public.cars;
CREATE POLICY "Users can delete own cars"
  ON public.cars FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_cars_updated_at ON public.cars;
CREATE TRIGGER set_cars_updated_at
  BEFORE UPDATE ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Table: drivers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status driver_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_owner_id ON public.drivers(owner_id);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own drivers" ON public.drivers;
CREATE POLICY "Users can view own drivers"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own drivers" ON public.drivers;
CREATE POLICY "Users can insert own drivers"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own drivers" ON public.drivers;
CREATE POLICY "Users can update own drivers"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own drivers" ON public.drivers;
CREATE POLICY "Users can delete own drivers"
  ON public.drivers FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_drivers_updated_at ON public.drivers;
CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. Table: daily_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  starting_km NUMERIC NOT NULL,
  ending_km NUMERIC NOT NULL,
  indrive_earnings NUMERIC NOT NULL DEFAULT 0,
  cash_earnings NUMERIC NOT NULL DEFAULT 0,
  online_earnings NUMERIC NOT NULL DEFAULT 0,
  fuel_cost NUMERIC NOT NULL DEFAULT 0,
  other_expenses NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_records_unique_car_driver_date UNIQUE (car_id, driver_id, record_date),
  CONSTRAINT daily_records_starting_km_check CHECK (starting_km >= 0),
  CONSTRAINT daily_records_ending_km_check CHECK (ending_km >= starting_km),
  CONSTRAINT daily_records_indrive_earnings_check CHECK (indrive_earnings >= 0),
  CONSTRAINT daily_records_cash_earnings_check CHECK (cash_earnings >= 0),
  CONSTRAINT daily_records_online_earnings_check CHECK (online_earnings >= 0),
  CONSTRAINT daily_records_fuel_cost_check CHECK (fuel_cost >= 0),
  CONSTRAINT daily_records_other_expenses_check CHECK (other_expenses >= 0)
);

CREATE INDEX IF NOT EXISTS idx_daily_records_car_id ON public.daily_records(car_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_driver_id ON public.daily_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_owner_id ON public.daily_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_record_date ON public.daily_records(record_date);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily records" ON public.daily_records;
CREATE POLICY "Users can view own daily records"
  ON public.daily_records FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own daily records" ON public.daily_records;
CREATE POLICY "Users can insert own daily records"
  ON public.daily_records FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own daily records" ON public.daily_records;
CREATE POLICY "Users can update own daily records"
  ON public.daily_records FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own daily records" ON public.daily_records;
CREATE POLICY "Users can delete own daily records"
  ON public.daily_records FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_daily_records_updated_at ON public.daily_records;
CREATE TRIGGER set_daily_records_updated_at
  BEFORE UPDATE ON public.daily_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Table: expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES public.daily_records(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_car_id ON public.expenses(car_id);
CREATE INDEX IF NOT EXISTS idx_expenses_driver_id ON public.expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_daily_record_id ON public.expenses(daily_record_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. Table: earnings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES public.daily_records(id) ON DELETE SET NULL,
  earning_date DATE NOT NULL,
  source earning_source NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT earnings_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_earnings_car_id ON public.earnings(car_id);
CREATE INDEX IF NOT EXISTS idx_earnings_driver_id ON public.earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_owner_id ON public.earnings(owner_id);
CREATE INDEX IF NOT EXISTS idx_earnings_earning_date ON public.earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_earnings_daily_record_id ON public.earnings(daily_record_id);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own earnings" ON public.earnings;
CREATE POLICY "Users can view own earnings"
  ON public.earnings FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own earnings" ON public.earnings;
CREATE POLICY "Users can insert own earnings"
  ON public.earnings FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own earnings" ON public.earnings;
CREATE POLICY "Users can update own earnings"
  ON public.earnings FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own earnings" ON public.earnings;
CREATE POLICY "Users can delete own earnings"
  ON public.earnings FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP TRIGGER IF EXISTS set_earnings_updated_at ON public.earnings;
CREATE TRIGGER set_earnings_updated_at
  BEFORE UPDATE ON public.earnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9. Trigger: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'owner'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10. GRANT table-level privileges to authenticated role
-- ============================================================
-- Without these GRANTs, the authenticated role receives
-- "permission denied for table" (42501) errors even when RLS
-- policies would otherwise allow access.
-- No grants to anon: all tables require authentication.
-- No sequence grants needed: PKs use gen_random_uuid().

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.profiles, public.cars, public.drivers,
   public.daily_records, public.expenses, public.earnings
TO authenticated;

-- ============================================================
-- 11. Repair: backfill profiles for existing auth.users
-- ============================================================
INSERT INTO public.profiles (user_id, full_name, email, role)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name',
    split_part(au.email, '@', 1)
  ) AS full_name,
  au.email,
  'owner'::profile_role AS role
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
