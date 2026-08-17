export type ProfileRole = "owner" | "admin";
export type DriverStatus = "active" | "inactive";
export type ExpenseCategory =
  | "fuel"
  | "maintenance"
  | "oil"
  | "tire"
  | "parking"
  | "toll"
  | "car_wash"
  | "other";
export type EarningSource = "indrive" | "other";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  name: string;
  registration_number: string;
  make: string;
  model: string;
  year: number | null;
  current_km: number;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  car_id: string;
  driver_id: string;
  record_date: string;
  shift_start: string | null;
  shift_end: string | null;
  starting_km: number;
  ending_km: number;
  indrive_earnings: number;
  cash_earnings: number;
  online_earnings: number;
  fuel_cost: number;
  other_expenses: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  car_id: string;
  driver_id: string;
  daily_record_id: string | null;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Earning {
  id: string;
  car_id: string;
  driver_id: string;
  daily_record_id: string | null;
  earning_date: string;
  source: EarningSource;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      cars: {
        Row: Car;
        Insert: Omit<Car, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Car, "id" | "created_at" | "updated_at">>;
      };
      drivers: {
        Row: Driver;
        Insert: Omit<Driver, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Driver, "id" | "created_at" | "updated_at">>;
      };
      daily_records: {
        Row: DailyRecord;
        Insert: Omit<DailyRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DailyRecord, "id" | "created_at" | "updated_at">>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Expense, "id" | "created_at" | "updated_at">>;
      };
      earnings: {
        Row: Earning;
        Insert: Omit<Earning, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Earning, "id" | "created_at" | "updated_at">>;
      };
    };
    Enums: {
      profile_role: ProfileRole;
      driver_status: DriverStatus;
      expense_category: ExpenseCategory;
      earning_source: EarningSource;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
