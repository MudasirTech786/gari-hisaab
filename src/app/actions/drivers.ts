"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { driverSchema, type DriverInput } from "@/lib/validations";

async function getOwnerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Profile not found");
  return profile.id;
}

export async function getDrivers() {
  try {
    const supabase = await createClient();
    const ownerId = await getOwnerId(supabase);

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("owner_id", ownerId)
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
    const ownerId = await getOwnerId(supabase);

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .eq("owner_id", ownerId)
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
    const ownerId = await getOwnerId(supabase);

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        status: parsed.data.status,
        owner_id: ownerId,
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
    const ownerId = await getOwnerId(supabase);

    const { data: driver, error } = await supabase
      .from("drivers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", ownerId)
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
    const ownerId = await getOwnerId(supabase);

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);

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
