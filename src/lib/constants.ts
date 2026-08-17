import { format, parseISO } from "date-fns";
import type {
  ExpenseCategory,
  DriverStatus,
  ProfileRole,
  EarningSource,
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
