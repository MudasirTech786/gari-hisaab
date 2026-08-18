"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { earningSchema, type EarningInput } from "@/lib/validations";

export async function getEarnings(filters?: {
  start_date?: string;
  end_date?: string;
  car_id?: string;
  driver_id?: string;
}) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    let query = supabase
      .from("earnings")
      .select("id, earning_date, source, amount, description, car_id, driver_id, daily_record_id, owner_id, workspace_id, created_at, updated_at, drivers(name)")
      .eq("workspace_id", workspaceId)
      .order("earning_date", { ascending: false });

    if (filters?.start_date) {
      query = query.gte("earning_date", filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte("earning_date", filters.end_date);
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
        error instanceof Error ? error.message : "Failed to fetch earnings",
    };
  }
}

export async function getEarningById(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("earnings")
      .select("id, earning_date, source, amount, description, car_id, driver_id, daily_record_id, workspace_id, cars(name, registration_number), drivers(name)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch earning",
    };
  }
}

export async function createEarning(data: EarningInput) {
  const parsed = earningSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: earning, error } = await supabase
      .from("earnings")
      .insert({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        daily_record_id: parsed.data.daily_record_id || null,
        earning_date: parsed.data.earning_date,
        source: parsed.data.source,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/earnings");
    revalidatePath("/dashboard");
    revalidatePath("/daily-records");
    return { success: true, data: earning };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create earning",
    };
  }
}

export async function updateEarning(id: string, data: EarningInput) {
  const parsed = earningSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: earning, error } = await supabase
      .from("earnings")
      .update({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        daily_record_id: parsed.data.daily_record_id || null,
        earning_date: parsed.data.earning_date,
        source: parsed.data.source,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/earnings");
    revalidatePath("/dashboard");
    return { success: true, data: earning };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update earning",
    };
  }
}

export async function deleteEarning(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { error } = await supabase
      .from("earnings")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    revalidatePath("/earnings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete earning",
    };
  }
}
