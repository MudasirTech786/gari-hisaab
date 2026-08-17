-- ============================================================
-- Gari Hisaab - Initial Schema Migration
-- ============================================================

-- Custom enum types
CREATE TYPE profile_role AS ENUM ('owner', 'admin');
CREATE TYPE driver_status AS ENUM ('active', 'inactive');
CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'oil', 'tire', 'parking', 'toll', 'car_wash', 'other');
CREATE TYPE earning_source AS ENUM ('indrive', 'other');

-- ============================================================
-- Table: profiles
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role profile_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Table: cars
-- ============================================================
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  current_km NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cars_year_check CHECK (year >= 1900 AND year <= 2100),
  CONSTRAINT cars_current_km_check CHECK (current_km >= 0)
);

CREATE INDEX idx_cars_owner_id ON cars(owner_id);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cars"
  ON cars FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own cars"
  ON cars FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own cars"
  ON cars FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own cars"
  ON cars FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Table: drivers
-- ============================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status driver_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_owner_id ON drivers(owner_id);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Table: daily_records
-- ============================================================
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
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

CREATE INDEX idx_daily_records_car_id ON daily_records(car_id);
CREATE INDEX idx_daily_records_driver_id ON daily_records(driver_id);
CREATE INDEX idx_daily_records_record_date ON daily_records(record_date);

ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily records"
  ON daily_records FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own daily records"
  ON daily_records FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own daily records"
  ON daily_records FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own daily records"
  ON daily_records FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Table: expenses
-- ============================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES daily_records(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_expenses_car_id ON expenses(car_id);
CREATE INDEX idx_expenses_driver_id ON expenses(driver_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_daily_record_id ON expenses(daily_record_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Table: earnings
-- ============================================================
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES daily_records(id) ON DELETE SET NULL,
  earning_date DATE NOT NULL,
  source earning_source NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT earnings_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_earnings_car_id ON earnings(car_id);
CREATE INDEX idx_earnings_driver_id ON earnings(driver_id);
CREATE INDEX idx_earnings_earning_date ON earnings(earning_date);
CREATE INDEX idx_earnings_daily_record_id ON earnings(daily_record_id);

ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings"
  ON earnings FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own earnings"
  ON earnings FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own earnings"
  ON earnings FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own earnings"
  ON earnings FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Trigger: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_cars_updated_at
  BEFORE UPDATE ON cars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_daily_records_updated_at
  BEFORE UPDATE ON daily_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_earnings_updated_at
  BEFORE UPDATE ON earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
