"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { driverSchema, type DriverInput } from "@/lib/validations";

export async function getDrivers() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("drivers")
      .select("id, name, phone, status, owner_id, workspace_id, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch drivers",
    };
  }
}

export async function getDriverById(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("drivers")
      .select("id, name, phone, status, owner_id, workspace_id, created_at, updated_at")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch driver",
    };
  }
}

export async function createDriver(data: DriverInput) {
  const parsed = driverSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);
    const workspaceId = await getWorkspaceId(supabase);

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone || "",
        status: parsed.data.status,
        owner_id: user.id,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/drivers");
    return { success: true, data: driver };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create driver",
    };
  }
}

export async function updateDriver(id: string, data: DriverInput) {
  const parsed = driverSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: driver, error } = await supabase
      .from("drivers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || "",
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/drivers");
    return { success: true, data: driver };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update driver",
    };
  }
}

export async function deleteDriver(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    revalidatePath("/drivers");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete driver",
    };
  }
}
