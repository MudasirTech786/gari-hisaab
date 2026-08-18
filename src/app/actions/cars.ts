"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { carSchema, type CarInput } from "@/lib/validations";

export async function getCars() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("cars")
      .select("id, name, registration_number, make, model, year, current_km, is_active, owner_id, workspace_id, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cars",
    };
  }
}

export async function getCarById(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("cars")
      .select("id, name, registration_number, make, model, year, current_km, is_active, owner_id, workspace_id, created_at, updated_at")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch car",
    };
  }
}

export async function createCar(data: CarInput) {
  const parsed = carSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);
    const workspaceId = await getWorkspaceId(supabase);

    const { data: car, error } = await supabase
      .from("cars")
      .insert({
        name: parsed.data.name,
        registration_number: parsed.data.registration_number,
        make: parsed.data.make || null,
        model: parsed.data.model || null,
        year: parsed.data.year || null,
        current_km: parsed.data.current_km,
        is_active: parsed.data.is_active,
        owner_id: user.id,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/car");
    revalidatePath("/cars");
    return { success: true, data: car };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create car",
    };
  }
}

export async function updateCar(id: string, data: CarInput) {
  const parsed = carSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: car, error } = await supabase
      .from("cars")
      .update({
        name: parsed.data.name,
        registration_number: parsed.data.registration_number,
        make: parsed.data.make || null,
        model: parsed.data.model || null,
        year: parsed.data.year || null,
        current_km: parsed.data.current_km,
        is_active: parsed.data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/car");
    revalidatePath("/cars");
    return { success: true, data: car };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update car",
    };
  }
}

export async function deleteCar(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { error } = await supabase
      .from("cars")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    revalidatePath("/car");
    revalidatePath("/cars");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete car",
    };
  }
}
