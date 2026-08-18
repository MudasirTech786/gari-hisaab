"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { dailyRecordSchema, type DailyRecordInput } from "@/lib/validations";

export async function getDailyRecords(filters?: {
  start_date?: string;
  end_date?: string;
  car_id?: string;
  driver_id?: string;
}) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    let query = supabase
      .from("daily_records")
      .select("id, car_id, driver_id, record_date, shift_start, shift_end, starting_km, ending_km, indrive_earnings, cash_earnings, online_earnings, fuel_cost, other_expenses, notes, owner_id, workspace_id, created_at, updated_at, cars(name, registration_number), drivers(name)")
      .eq("workspace_id", workspaceId)
      .order("record_date", { ascending: false });

    if (filters?.start_date) {
      query = query.gte("record_date", filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte("record_date", filters.end_date);
    }
    if (filters?.car_id) {
      query = query.eq("car_id", filters.car_id);
    }
    if (filters?.driver_id) {
      query = query.eq("driver_id", filters.driver_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch daily records",
    };
  }
}

export async function getDailyRecordById(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("daily_records")
      .select("id, car_id, driver_id, record_date, shift_start, shift_end, starting_km, ending_km, indrive_earnings, cash_earnings, online_earnings, fuel_cost, other_expenses, notes, created_at, updated_at, cars(name, registration_number), drivers(name)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch daily record",
    };
  }
}

export async function createDailyRecord(data: DailyRecordInput) {
  const parsed = dailyRecordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: existing } = await supabase
      .from("daily_records")
      .select("id")
      .eq("driver_id", parsed.data.driver_id)
      .eq("car_id", parsed.data.car_id)
      .eq("record_date", parsed.data.record_date)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "A record already exists for this driver, car, and date",
      };
    }

    const { data: record, error } = await supabase
      .from("daily_records")
      .insert({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        record_date: parsed.data.record_date,
        shift_start: parsed.data.shift_start || null,
        shift_end: parsed.data.shift_end || null,
        starting_km: parsed.data.starting_km,
        ending_km: parsed.data.ending_km,
        indrive_earnings: parsed.data.indrive_earnings,
        cash_earnings: parsed.data.cash_earnings,
        online_earnings: parsed.data.online_earnings,
        fuel_cost: parsed.data.fuel_cost,
        other_expenses: parsed.data.other_expenses,
        notes: parsed.data.notes || null,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("cars")
      .update({
        current_km: parsed.data.ending_km,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.car_id)
      .eq("workspace_id", workspaceId);

    revalidatePath("/daily-records");
    revalidatePath("/dashboard");
    revalidatePath("/car");
    return { success: true, data: record };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create daily record",
    };
  }
}

export async function updateDailyRecord(id: string, data: DailyRecordInput) {
  const parsed = dailyRecordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: existing } = await supabase
      .from("daily_records")
      .select("id")
      .eq("driver_id", parsed.data.driver_id)
      .eq("car_id", parsed.data.car_id)
      .eq("record_date", parsed.data.record_date)
      .eq("workspace_id", workspaceId)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "A record already exists for this driver, car, and date",
      };
    }

    const { data: record, error } = await supabase
      .from("daily_records")
      .update({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        record_date: parsed.data.record_date,
        shift_start: parsed.data.shift_start || null,
        shift_end: parsed.data.shift_end || null,
        starting_km: parsed.data.starting_km,
        ending_km: parsed.data.ending_km,
        indrive_earnings: parsed.data.indrive_earnings,
        cash_earnings: parsed.data.cash_earnings,
        online_earnings: parsed.data.online_earnings,
        fuel_cost: parsed.data.fuel_cost,
        other_expenses: parsed.data.other_expenses,
        notes: parsed.data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("cars")
      .update({
        current_km: parsed.data.ending_km,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.car_id)
      .eq("workspace_id", workspaceId);

    revalidatePath("/daily-records");
    revalidatePath("/dashboard");
    revalidatePath("/car");
    return { success: true, data: record };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update daily record",
    };
  }
}

export async function deleteDailyRecord(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { error } = await supabase
      .from("daily_records")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    revalidatePath("/daily-records");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete daily record",
    };
  }
}
