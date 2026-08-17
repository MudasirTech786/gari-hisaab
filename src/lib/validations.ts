import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"], {
    required_error: "Status is required",
  }),
});

export type DriverInput = z.infer<typeof driverSchema>;

export const carSchema = z.object({
  name: z.string().min(1, "Car name is required"),
  registration_number: z.string().min(1, "Registration number is required"),
  make: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  current_km: z.coerce.number().min(0, "Current KM cannot be negative"),
  is_active: z.boolean(),
});

export type CarInput = z.infer<typeof carSchema>;

export const dailyRecordSchema = z
  .object({
    car_id: z.string().uuid("Please select a car"),
    driver_id: z.string().uuid("Please select a driver"),
    record_date: z.string().min(1, "Record date is required"),
    shift_start: z.string().optional().or(z.literal("")),
    shift_end: z.string().optional().or(z.literal("")),
    starting_km: z.coerce.number().min(0, "Starting KM cannot be negative"),
    ending_km: z.coerce.number().min(0, "Ending KM cannot be negative"),
    indrive_earnings: z.coerce.number().min(0).default(0),
    cash_earnings: z.coerce.number().min(0).default(0),
    online_earnings: z.coerce.number().min(0).default(0),
    fuel_cost: z.coerce.number().min(0).default(0),
    other_expenses: z.coerce.number().min(0).default(0),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.ending_km >= data.starting_km, {
    message: "Ending KM must be greater than or equal to starting KM",
    path: ["ending_km"],
  });

export type DailyRecordInput = z.infer<typeof dailyRecordSchema>;

export const expenseCategoryEnum = z.enum([
  "fuel",
  "maintenance",
  "oil",
  "tire",
  "parking",
  "toll",
  "car_wash",
  "other",
]);

export const expenseSchema = z.object({
  car_id: z.string().uuid("Please select a car"),
  driver_id: z.string().uuid("Please select a driver"),
  daily_record_id: z.string().uuid().optional().nullable(),
  expense_date: z.string().min(1, "Expense date is required"),
  category: expenseCategoryEnum,
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const earningSourceEnum = z.enum([
  "indrive",
  "other",
]);

export const earningSchema = z.object({
  car_id: z.string().uuid("Please select a car"),
  driver_id: z.string().uuid("Please select a driver"),
  daily_record_id: z.string().uuid().optional().nullable(),
  earning_date: z.string().min(1, "Earning date is required"),
  source: earningSourceEnum,
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().optional().or(z.literal("")),
});

export type EarningInput = z.infer<typeof earningSchema>;

export const dateRangeSchema = z.object({
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export const reportFilterSchema = z.object({
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  driver_id: z.string().uuid().optional().nullable(),
  car_id: z.string().uuid().optional().nullable(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
