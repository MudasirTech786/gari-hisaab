export type ProfileRole = "owner" | "admin" | "platform_admin" | "customer";
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
export type WorkspaceMemberRole = "owner" | "admin" | "manager" | "driver" | "viewer";
export type MaintenanceType = "oil_change" | "brake" | "tyres" | "battery" | "engine" | "ac" | "repair" | "service" | "other";
export type VehicleDocumentType = "registration" | "insurance" | "token_tax" | "fitness" | "permit" | "other";
export type VehicleStatusType = "active" | "inactive" | "maintenance";
export type AssignmentStatus = "active" | "completed" | "cancelled";

export type WorkspaceStatus = "active" | "suspended" | "inactive";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: ProfileRole;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
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
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  owner_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface DriverVehicleAssignment {
  id: string;
  workspace_id: string;
  driver_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  car_id: string;
  driver_id: string;
  workspace_id: string;
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
  workspace_id: string;
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
  workspace_id: string;
  daily_record_id: string | null;
  earning_date: string;
  source: EarningSource;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuelRecord {
  id: string;
  workspace_id: string;
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  litres: number;
  price_per_litre: number;
  total_amount: number;
  odometer: number | null;
  station: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  workspace_id: string;
  vehicle_id: string;
  date: string;
  type: MaintenanceType;
  description: string | null;
  cost: number;
  odometer: number | null;
  workshop: string | null;
  next_service_date: string | null;
  next_service_odometer: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  workspace_id: string;
  vehicle_id: string;
  document_type: VehicleDocumentType;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  workspace_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Workspace, "id" | "created_at" | "updated_at">>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Omit<WorkspaceMember, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WorkspaceMember, "id" | "created_at" | "updated_at">>;
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
      driver_vehicle_assignments: {
        Row: DriverVehicleAssignment;
        Insert: Omit<DriverVehicleAssignment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DriverVehicleAssignment, "id" | "created_at" | "updated_at">>;
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
      fuel_records: {
        Row: FuelRecord;
        Insert: Omit<FuelRecord, "id" | "created_at">;
        Update: Partial<Omit<FuelRecord, "id" | "created_at">>;
      };
      maintenance_records: {
        Row: MaintenanceRecord;
        Insert: Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">>;
      };
      vehicle_documents: {
        Row: VehicleDocument;
        Insert: Omit<VehicleDocument, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<VehicleDocument, "id" | "created_at" | "updated_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: Partial<Omit<AuditLog, "id" | "created_at">>;
      };
    };
    Enums: {
      profile_role: ProfileRole;
      driver_status: DriverStatus;
      expense_category: ExpenseCategory;
      earning_source: EarningSource;
      workspace_member_role: WorkspaceMemberRole;
      maintenance_type: MaintenanceType;
      vehicle_document_type: VehicleDocumentType;
      vehicle_status: VehicleStatusType;
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
