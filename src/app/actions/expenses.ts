"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { expenseSchema, type ExpenseInput } from "@/lib/validations";

export async function getExpenses(filters?: {
  start_date?: string;
  end_date?: string;
  car_id?: string;
  driver_id?: string;
  category?: string;
}) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    let query = supabase
      .from("expenses")
      .select("id, expense_date, category, amount, description, car_id, driver_id, daily_record_id, owner_id, workspace_id, created_at, updated_at, drivers(name)")
      .eq("workspace_id", workspaceId)
      .order("expense_date", { ascending: false });

    if (filters?.start_date) {
      query = query.gte("expense_date", filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte("expense_date", filters.end_date);
    }
    if (filters?.car_id) {
      query = query.eq("car_id", filters.car_id);
    }
    if (filters?.driver_id) {
      query = query.eq("driver_id", filters.driver_id);
    }
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch expenses",
    };
  }
}

export async function getExpenseById(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("expenses")
      .select("id, expense_date, category, amount, description, car_id, driver_id, daily_record_id, workspace_id, cars(name, registration_number), drivers(name)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch expense",
    };
  }
}

export async function createExpense(data: ExpenseInput) {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        daily_record_id: parsed.data.daily_record_id || null,
        expense_date: parsed.data.expense_date,
        category: parsed.data.category,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/daily-records");
    return { success: true, data: expense };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}

export async function updateExpense(id: string, data: ExpenseInput) {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { data: expense, error } = await supabase
      .from("expenses")
      .update({
        car_id: parsed.data.car_id,
        driver_id: parsed.data.driver_id,
        daily_record_id: parsed.data.daily_record_id || null,
        expense_date: parsed.data.expense_date,
        category: parsed.data.category,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true, data: expense };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update expense",
    };
  }
}

export async function deleteExpense(id: string) {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete expense",
    };
  }
}
