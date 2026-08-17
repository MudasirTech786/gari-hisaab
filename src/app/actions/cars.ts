"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { carSchema, type CarInput } from "@/lib/validations";

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

export async function getCars() {
  try {
    const supabase = await createClient();
    const ownerId = await getOwnerId(supabase);

    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq("owner_id", ownerId)
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
    const ownerId = await getOwnerId(supabase);

    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq("id", id)
      .eq("owner_id", ownerId)
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
    const ownerId = await getOwnerId(supabase);

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
        owner_id: ownerId,
      })
      .select()
      .single();

    if (error) throw error;

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
    const ownerId = await getOwnerId(supabase);

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
      .eq("owner_id", ownerId)
      .select()
      .single();

    if (error) throw error;

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
    const ownerId = await getOwnerId(supabase);

    const { error } = await supabase
      .from("cars")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);

    if (error) throw error;

    revalidatePath("/cars");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete car",
    };
  }
}
