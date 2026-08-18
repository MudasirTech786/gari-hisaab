import { format, parseISO } from "date-fns";
import type {
  ExpenseCategory,
  DriverStatus,
  ProfileRole,
  EarningSource,
  WorkspaceMemberRole,
  MaintenanceType,
  VehicleDocumentType,
} from "./types";

export const EXPENSE_CATEGORIES: {
  label: string;
  value: ExpenseCategory;
}[] = [
  { label: "Fuel", value: "fuel" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Oil", value: "oil" },
  { label: "Tire", value: "tire" },
  { label: "Parking", value: "parking" },
  { label: "Toll", value: "toll" },
  { label: "Car Wash", value: "car_wash" },
  { label: "Other", value: "other" },
];

export const EARNING_SOURCES: {
  label: string;
  value: EarningSource;
}[] = [
  { label: "InDrive", value: "indrive" },
  { label: "Other", value: "other" },
];

export const DRIVER_STATUSES: {
  label: string;
  value: DriverStatus;
}[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export const PROFILE_ROLES: {
  label: string;
  value: ProfileRole;
}[] = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
];

export const WORKSPACE_ROLES: {
  label: string;
  value: WorkspaceMemberRole;
}[] = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Driver", value: "driver" },
  { label: "Viewer", value: "viewer" },
];

export const MAINTENANCE_TYPES: {
  label: string;
  value: MaintenanceType;
}[] = [
  { label: "Oil Change", value: "oil_change" },
  { label: "Brake", value: "brake" },
  { label: "Tyres", value: "tyres" },
  { label: "Battery", value: "battery" },
  { label: "Engine", value: "engine" },
  { label: "AC", value: "ac" },
  { label: "Repair", value: "repair" },
  { label: "Service", value: "service" },
  { label: "Other", value: "other" },
];

export const VEHICLE_DOCUMENT_TYPES: {
  label: string;
  value: VehicleDocumentType;
}[] = [
  { label: "Registration", value: "registration" },
  { label: "Insurance", value: "insurance" },
  { label: "Token Tax", value: "token_tax" },
  { label: "Fitness", value: "fitness" },
  { label: "Permit", value: "permit" },
  { label: "Other", value: "other" },
];

export function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy");
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy, hh:mm a");
}
