"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export async function getWorkspaceInfo() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name, slug, owner_id, created_at, updated_at")
      .eq("id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch workspace",
    };
  }
}

export async function getWorkspaceMembers() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, created_at, updated_at, profiles:user_id(full_name, email)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch members",
    };
  }
}

export async function updateWorkspaceName(name: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Workspace name is required" };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspaces")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/settings");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update workspace",
    };
  }
}

export async function createNewWorkspace(name: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Workspace name is required" };
  }

  try {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);

    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      user.id.substring(0, 8);

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), slug, owner_id: user.id })
      .select()
      .single();

    if (wsError) throw wsError;

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

    revalidatePath("/dashboard");
    return { success: true, data: workspace };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create workspace",
    };
  }
}

export async function createInitialCar(data: {
  name: string;
  registration_number: string;
  make?: string;
  model?: string;
  year?: number;
}) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);
    const workspaceId = await getWorkspaceId(supabase);

    const { data: car, error } = await supabase
      .from("cars")
      .insert({
        name: data.name,
        registration_number: data.registration_number,
        make: data.make || "",
        model: data.model || "",
        year: data.year || null,
        current_km: 0,
        is_active: true,
        owner_id: user.id,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/car");
    revalidatePath("/dashboard");
    return { success: true, data: car };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create car",
    };
  }
}

export async function createInitialDriver(data: {
  name: string;
  phone?: string;
}) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);
    const workspaceId = await getWorkspaceId(supabase);

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        name: data.name,
        phone: data.phone || "",
        status: "active" as const,
        owner_id: user.id,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/drivers");
    revalidatePath("/dashboard");
    return { success: true, data: driver };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create driver",
    };
  }
}

export async function getWorkspaceFleetStats() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const [carsResult, driversResult] = await Promise.all([
      supabase
        .from("cars")
        .select("id, is_active")
        .eq("workspace_id", workspaceId),
      supabase
        .from("drivers")
        .select("id, status")
        .eq("workspace_id", workspaceId),
    ]);

    return {
      success: true,
      data: {
        total_cars: (carsResult.data || []).length,
        active_cars: (carsResult.data || []).filter((c) => c.is_active).length,
        total_drivers: (driversResult.data || []).length,
        active_drivers: (driversResult.data || []).filter((d) => d.status === "active").length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch fleet stats",
    };
  }
}
