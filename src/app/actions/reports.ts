"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/supabase/auth";
import { reportFilterSchema, type ReportFilterInput } from "@/lib/validations";

export async function getReportData(filters: ReportFilterInput) {
  const parsed = reportFilterSchema.safeParse(filters);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const supabase = await createClient();
    const workspaceId = await getWorkspaceId(supabase);

    let recordsQuery = supabase
      .from("daily_records")
      .select("id, driver_id, record_date, starting_km, ending_km, indrive_earnings, fuel_cost, other_expenses, drivers(name)")
      .eq("workspace_id", workspaceId)
      .order("record_date", { ascending: true });

    if (parsed.data.start_date) {
      recordsQuery = recordsQuery.gte("record_date", parsed.data.start_date);
    }
    if (parsed.data.end_date) {
      recordsQuery = recordsQuery.lte("record_date", parsed.data.end_date);
    }
    if (parsed.data.car_id) {
      recordsQuery = recordsQuery.eq("car_id", parsed.data.car_id);
    }
    if (parsed.data.driver_id) {
      recordsQuery = recordsQuery.eq("driver_id", parsed.data.driver_id);
    }

    let expensesQuery = supabase
      .from("expenses")
      .select("expense_date, category, amount, car_id, driver_id")
      .eq("workspace_id", workspaceId)
      .order("expense_date", { ascending: true });

    if (parsed.data.start_date) {
      expensesQuery = expensesQuery.gte("expense_date", parsed.data.start_date);
    }
    if (parsed.data.end_date) {
      expensesQuery = expensesQuery.lte("expense_date", parsed.data.end_date);
    }
    if (parsed.data.car_id) {
      expensesQuery = expensesQuery.eq("car_id", parsed.data.car_id);
    }
    if (parsed.data.driver_id) {
      expensesQuery = expensesQuery.eq("driver_id", parsed.data.driver_id);
    }

    const [recordsResult, expensesResult] = await Promise.all([
      recordsQuery,
      expensesQuery,
    ]);

    if (recordsResult.error) throw recordsResult.error;
    if (expensesResult.error) throw expensesResult.error;

    const records = recordsResult.data || [];
    const standaloneExpenses = expensesResult.data || [];

    const totalEarnings = records.reduce(
      (sum, r) => sum + Number(r.indrive_earnings),
      0
    );
    const recordExpenses = records.reduce(
      (sum, r) => sum + Number(r.fuel_cost) + Number(r.other_expenses),
      0
    );
    const standaloneExpensesTotal = standaloneExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );
    const totalExpenses = recordExpenses + standaloneExpensesTotal;
    const netProfit = totalEarnings - totalExpenses;
    const totalKm = records.reduce(
      (sum, r) => sum + (Number(r.ending_km) - Number(r.starting_km)),
      0
    );
    const totalFuelCost = records.reduce(
      (sum, r) => sum + Number(r.fuel_cost),
      0
    );
    const uniqueDays = new Set(records.map((r) => r.record_date)).size;
    const avgEarningsPerDay = uniqueDays > 0 ? totalEarnings / uniqueDays : 0;
    const avgProfitPerDay = uniqueDays > 0 ? netProfit / uniqueDays : 0;
    const costPerKm = totalKm > 0 ? totalExpenses / totalKm : 0;

    const dailyMap: Record<string, { earnings: number; expenses: number; km: number }> = {};

    records.forEach((r) => {
      const dayEarnings = Number(r.indrive_earnings);
      const dayRecordExpenses = Number(r.fuel_cost) + Number(r.other_expenses);
      const dayKm = Number(r.ending_km) - Number(r.starting_km);

      if (!dailyMap[r.record_date]) {
        dailyMap[r.record_date] = { earnings: 0, expenses: 0, km: 0 };
      }
      dailyMap[r.record_date].earnings += dayEarnings;
      dailyMap[r.record_date].expenses += dayRecordExpenses;
      dailyMap[r.record_date].km += dayKm;
    });

    standaloneExpenses.forEach((e) => {
      if (!dailyMap[e.expense_date]) {
        dailyMap[e.expense_date] = { earnings: 0, expenses: 0, km: 0 };
      }
      dailyMap[e.expense_date].expenses += Number(e.amount);
    });

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        earnings: Math.round(values.earnings * 100) / 100,
        expenses: Math.round(values.expenses * 100) / 100,
        profit: Math.round((values.earnings - values.expenses) * 100) / 100,
        km: Math.round(values.km * 100) / 100,
      }));

    const categoryMap: Record<string, number> = {};
    records.forEach((r) => {
      if (Number(r.fuel_cost) > 0) {
        categoryMap["fuel"] = (categoryMap["fuel"] || 0) + Number(r.fuel_cost);
      }
      if (Number(r.other_expenses) > 0) {
        categoryMap["other"] = (categoryMap["other"] || 0) + Number(r.other_expenses);
      }
    });
    standaloneExpenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
    });

    const expensesByCategory = Object.entries(categoryMap)
      .map(([category, total]) => ({
        category,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    const driverMap: Record<string, {
      driver_name: string;
      earnings: number;
      expenses: number;
      km: number;
      days: Set<string>;
    }> = {};

    records.forEach((r) => {
      const driverName = ((r.drivers as unknown as { name: string }[] | null)?.[0]?.name) || "Unknown";
      if (!driverMap[r.driver_id]) {
        driverMap[r.driver_id] = {
          driver_name: driverName,
          earnings: 0,
          expenses: 0,
          km: 0,
          days: new Set(),
        };
      }
      const entry = driverMap[r.driver_id];
      entry.earnings += Number(r.indrive_earnings);
      entry.expenses += Number(r.fuel_cost) + Number(r.other_expenses);
      entry.km += Number(r.ending_km) - Number(r.starting_km);
      entry.days.add(r.record_date);
    });

    const driverComparison = Object.values(driverMap).map((d) => ({
      driver_name: d.driver_name,
      earnings: Math.round(d.earnings * 100) / 100,
      expenses: Math.round(d.expenses * 100) / 100,
      profit: Math.round((d.earnings - d.expenses) * 100) / 100,
      km: Math.round(d.km * 100) / 100,
      days: d.days.size,
    }));

    const kmByDay = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        km: Math.round(values.km * 100) / 100,
      }));

    return {
      success: true,
      data: {
        summary: {
          total_earnings: Math.round(totalEarnings * 100) / 100,
          total_expenses: Math.round(totalExpenses * 100) / 100,
          net_profit: Math.round(netProfit * 100) / 100,
          total_km: Math.round(totalKm * 100) / 100,
          avg_earnings_per_day: Math.round(avgEarningsPerDay * 100) / 100,
          avg_profit_per_day: Math.round(avgProfitPerDay * 100) / 100,
          fuel_cost: Math.round(totalFuelCost * 100) / 100,
          cost_per_km: Math.round(costPerKm * 100) / 100,
        },
        daily_breakdown: dailyBreakdown,
        expenses_by_category: expensesByCategory,
        driver_comparison: driverComparison,
        km_by_day: kmByDay,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate report data",
    };
  }
}
