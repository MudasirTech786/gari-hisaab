"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/supabase/auth";

export async function getDashboardData() {
  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      todayRecords,
      monthRecords,
      allRecords,
      recentRecords,
      recentExpenses,
      drivers,
      todayExpenses,
      monthExpenses,
      thirtyDayExpenses,
      cars,
    ] = await Promise.all([
      supabase
        .from("daily_records")
        .select("indrive_earnings, fuel_cost, other_expenses, starting_km, ending_km, driver_id")
        .eq("workspace_id", workspaceId)
        .eq("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("indrive_earnings, fuel_cost, other_expenses, starting_km, ending_km, record_date")
        .eq("workspace_id", workspaceId)
        .gte("record_date", monthStart)
        .lte("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("indrive_earnings, fuel_cost, other_expenses, driver_id, record_date")
        .eq("workspace_id", workspaceId)
        .gte("record_date", thirtyDaysAgoStr)
        .lte("record_date", todayStr),
      supabase
        .from("daily_records")
        .select("id, driver_id, record_date, indrive_earnings, cash_earnings, online_earnings, fuel_cost, other_expenses, starting_km, ending_km, cars(name, registration_number), drivers(name)")
        .eq("workspace_id", workspaceId)
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("expenses")
        .select("id, expense_date, category, amount, description, drivers(name), cars(name)")
        .eq("workspace_id", workspaceId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("drivers")
        .select("id, name")
        .eq("workspace_id", workspaceId),
      supabase
        .from("expenses")
        .select("amount")
        .eq("workspace_id", workspaceId)
        .eq("expense_date", todayStr),
      supabase
        .from("expenses")
        .select("amount")
        .eq("workspace_id", workspaceId)
        .gte("expense_date", monthStart)
        .lte("expense_date", todayStr),
      supabase
        .from("expenses")
        .select("expense_date, amount")
        .eq("workspace_id", workspaceId)
        .gte("expense_date", thirtyDaysAgoStr)
        .lte("expense_date", todayStr),
      supabase
        .from("cars")
        .select("id, name, is_active")
        .eq("workspace_id", workspaceId),
    ]);

    const todayData = todayRecords.data || [];
    const todayExpenseData = todayExpenses.data || [];

    const todayEarnings = todayData.reduce(
      (sum, r) => sum + Number(r.indrive_earnings),
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

    const monthData = monthRecords.data || [];
    const monthExpenseData = monthExpenses.data || [];

    const monthEarnings = monthData.reduce(
      (sum, r) => sum + Number(r.indrive_earnings),
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
    const avgDailyEarnings = daysInMonthSoFar > 0 ? monthEarnings / daysInMonthSoFar : 0;
    const avgDailyProfit = daysInMonthSoFar > 0 ? (monthEarnings - monthExpenseAmount) / daysInMonthSoFar : 0;

    const thirtyDaysData = allRecords.data || [];
    const earningsByDate: Record<string, number> = {};
    const profitByDate: Record<string, number> = {};
    const allExpensesMap: Record<string, number> = {};

    (thirtyDayExpenses.data || []).forEach((e) => {
      allExpensesMap[e.expense_date] = (allExpensesMap[e.expense_date] || 0) + Number(e.amount);
    });

    thirtyDaysData.forEach((r) => {
      const dayEarnings = Number(r.indrive_earnings);
      const dayRecordExpenses = Number(r.fuel_cost) + Number(r.other_expenses);
      earningsByDate[r.record_date] = (earningsByDate[r.record_date] || 0) + dayEarnings;
      profitByDate[r.record_date] = (profitByDate[r.record_date] || 0) + dayEarnings - dayRecordExpenses;
    });

    Object.keys(allExpensesMap).forEach((date) => {
      profitByDate[date] = (profitByDate[date] || 0) - allExpensesMap[date];
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

    const driverMap: Record<string, {
      driver_name: string;
      earnings: number;
      expenses: number;
      profit: number;
      days_worked: Set<string>;
    }> = {};

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
        const dayEarnings = Number(r.indrive_earnings);
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

    const fleetStats = {
      total_cars: (cars.data || []).length,
      active_cars: (cars.data || []).filter((c) => c.is_active).length,
      total_drivers: (drivers.data || []).length,
    };

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
        fleet: fleetStats,
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
