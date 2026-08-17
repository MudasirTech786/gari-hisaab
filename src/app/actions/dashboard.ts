"use server";

import { createClient } from "@/lib/supabase/server";

async function getOwnerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[DIAG] AUTH FAILED:", authError?.message, authError?.code);
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profile) return user.id;

  // Profile missing - log the reason and create it
  console.warn(
    "[DIAG] Profile not found for user",
    user.id,
    "- profileError:",
    profileError?.message,
    profileError?.code,
    "- attempting insert"
  );

  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User",
      email: user.email || "",
      role: "owner",
    })
    .select("id")
    .single();

  if (createError || !newProfile) {
    console.error(
      "[DIAG] PROFILE CREATE FAILED:",
      createError?.message,
      createError?.code,
      createError?.details,
      createError?.hint
    );
    throw new Error("Profile not found");
  }

  console.warn("[DIAG] Profile created on the fly:", newProfile.id);
  return user.id;
}

export async function getDashboardData() {
  try {
    const supabase = await createClient();
    const ownerId = await getOwnerId(supabase);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Fetch all needed data in parallel
    const [
      todayRecords,
      monthRecords,
      allRecords,
      recentRecords,
      recentExpenses,
      drivers,
      todayExpenses,
      monthExpenses,
    ] = await Promise.all([
      supabase
        .from("daily_records")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("*")
        .eq("owner_id", ownerId)
        .gte("record_date", monthStart)
        .lte("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("*")
        .eq("owner_id", ownerId)
        .gte("record_date", thirtyDaysAgoStr)
        .lte("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("*, cars(name, registration_number), drivers(name)")
        .eq("owner_id", ownerId)
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("expenses")
        .select("*, drivers(name), cars(name)")
        .eq("owner_id", ownerId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("drivers")
        .select("id, name")
        .eq("owner_id", ownerId),
      supabase
        .from("expenses")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("expense_date", todayStr),
      supabase
        .from("expenses")
        .select("*")
        .eq("owner_id", ownerId)
        .gte("expense_date", monthStart)
        .lte("expense_date", todayStr),
    ]);

    // ---- TODAY ----
    const todayData = todayRecords.data || [];
    const todayExpenseData = todayExpenses.data || [];

    const todayEarnings = todayData.reduce(
      (sum, r) =>
        sum +
        Number(r.indrive_earnings),
      0
    );
    const todayExpenseAmount =
      todayData.reduce(
        (sum, r) => sum + Number(r.fuel_cost) + Number(r.other_expenses),
        0
      ) + todayExpenseData.reduce((sum, e) => sum + Number(e.amount), 0);
    const todayKm = todayData.reduce(
      (sum, r) => sum + (Number(r.ending_km) - Number(r.starting_km)),
      0
    );
    const todayCurrentDriver = todayData.length > 0 ? todayData[0].driver_id : null;

    // ---- MONTH ----
    const monthData = monthRecords.data || [];
    const monthExpenseData = monthExpenses.data || [];

    const monthEarnings = monthData.reduce(
      (sum, r) =>
        sum +
        Number(r.indrive_earnings),
      0
    );
    const monthExpenseAmount =
      monthData.reduce(
        (sum, r) => sum + Number(r.fuel_cost) + Number(r.other_expenses),
        0
      ) + monthExpenseData.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthKm = monthData.reduce(
      (sum, r) => sum + (Number(r.ending_km) - Number(r.starting_km)),
      0
    );
    const daysInMonthSoFar = new Set(monthData.map((r) => r.record_date)).size;
    const avgDailyEarnings =
      daysInMonthSoFar > 0 ? monthEarnings / daysInMonthSoFar : 0;
    const avgDailyProfit =
      daysInMonthSoFar > 0
        ? (monthEarnings - monthExpenseAmount) / daysInMonthSoFar
        : 0;

    // ---- EARNINGS TREND (last 30 days) ----
    const thirtyDaysData = allRecords.data || [];
    const earningsByDate: Record<string, number> = {};
    const profitByDate: Record<string, number> = {};
    const allExpensesMap: Record<string, number> = {};

    // Gather expenses for last 30 days
    const { data: thirtyDayExpenses } = await supabase
      .from("expenses")
      .select("expense_date, amount")
      .eq("owner_id", ownerId)
      .gte("expense_date", thirtyDaysAgoStr)
      .lte("expense_date", todayStr);

    (thirtyDayExpenses || []).forEach((e) => {
      allExpensesMap[e.expense_date] =
        (allExpensesMap[e.expense_date] || 0) + Number(e.amount);
    });

    thirtyDaysData.forEach((r) => {
      const dayEarnings =
        Number(r.indrive_earnings);
      const dayRecordExpenses = Number(r.fuel_cost) + Number(r.other_expenses);
      earningsByDate[r.record_date] =
        (earningsByDate[r.record_date] || 0) + dayEarnings;
      profitByDate[r.record_date] =
        (profitByDate[r.record_date] || 0) +
        dayEarnings -
        dayRecordExpenses;
    });

    // Subtract standalone expenses from profit
    Object.keys(allExpensesMap).forEach((date) => {
      profitByDate[date] =
        (profitByDate[date] || 0) - allExpensesMap[date];
    });

    const earningsTrend: { date: string; amount: number }[] = [];
    const profitTrend: { date: string; amount: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      earningsTrend.push({
        date: dateStr,
        amount: Math.round((earningsByDate[dateStr] || 0) * 100) / 100,
      });
      profitTrend.push({
        date: dateStr,
        amount: Math.round((profitByDate[dateStr] || 0) * 100) / 100,
      });
    }

    // ---- DRIVER COMPARISON ----
    const driverMap: Record<
      string,
      {
        driver_name: string;
        earnings: number;
        expenses: number;
        profit: number;
        days_worked: Set<string>;
      }
    > = {};

    (drivers.data || []).forEach((d) => {
      driverMap[d.id] = {
        driver_name: d.name,
        earnings: 0,
        expenses: 0,
        profit: 0,
        days_worked: new Set(),
      };
    });

    thirtyDaysData.forEach((r) => {
      if (driverMap[r.driver_id]) {
        const dayEarnings =
          Number(r.indrive_earnings);
        const dayExpenses = Number(r.fuel_cost) + Number(r.other_expenses);
        driverMap[r.driver_id].earnings += dayEarnings;
        driverMap[r.driver_id].expenses += dayExpenses;
        driverMap[r.driver_id].days_worked.add(r.record_date);
      }
    });

    const driverComparison = Object.values(driverMap).map((d) => ({
      driver_name: d.driver_name,
      earnings: Math.round(d.earnings * 100) / 100,
      expenses: Math.round(d.expenses * 100) / 100,
      profit: Math.round((d.earnings - d.expenses) * 100) / 100,
      days_worked: d.days_worked.size,
    }));

    return {
      success: true,
      data: {
        today: {
          earnings: Math.round(todayEarnings * 100) / 100,
          expenses: Math.round(todayExpenseAmount * 100) / 100,
          net_profit: Math.round((todayEarnings - todayExpenseAmount) * 100) / 100,
          km: Math.round(todayKm * 100) / 100,
          current_driver: todayCurrentDriver,
        },
        month: {
          total_earnings: Math.round(monthEarnings * 100) / 100,
          total_expenses: Math.round(monthExpenseAmount * 100) / 100,
          net_profit: Math.round((monthEarnings - monthExpenseAmount) * 100) / 100,
          total_km: Math.round(monthKm * 100) / 100,
          avg_daily_earnings: Math.round(avgDailyEarnings * 100) / 100,
          avg_daily_profit: Math.round(avgDailyProfit * 100) / 100,
        },
        earnings_trend: earningsTrend,
        profit_trend: profitTrend,
        driver_comparison: driverComparison,
        recent_records: recentRecords.data || [],
        recent_expenses: recentExpenses.data || [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data",
    };
  }
}
