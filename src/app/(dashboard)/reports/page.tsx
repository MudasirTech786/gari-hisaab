"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Calendar,
  BarChart3,
  Fuel,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getReportData } from "@/app/actions/reports";
import { getDrivers } from "@/app/actions/drivers";
import { getCars } from "@/app/actions/cars";
import { formatCurrency } from "@/lib/constants";
import type { Driver, Car } from "@/lib/types";

interface ReportSummary {
  total_earnings: number;
  total_expenses: number;
  net_profit: number;
  total_km: number;
  avg_earnings_per_day: number;
  avg_profit_per_day: number;
  fuel_cost: number;
  cost_per_km: number;
}

interface DailyBreakdown {
  date: string;
  earnings: number;
  expenses: number;
  profit: number;
  km: number;
}

interface ExpensesByCategory {
  category: string;
  total: number;
}

interface DriverComparison {
  driver_name: string;
  earnings: number;
  expenses: number;
  profit: number;
  km: number;
  days: number;
}

interface KmByDay {
  date: string;
  km: number;
}

interface ReportData {
  summary: ReportSummary;
  daily_breakdown: DailyBreakdown[];
  expenses_by_category: ExpensesByCategory[];
  driver_comparison: DriverComparison[];
  km_by_day: KmByDay[];
}

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6b7280",
];

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Fuel",
  maintenance: "Maintenance",
  oil: "Oil",
  tire: "Tire",
  parking: "Parking",
  toll: "Toll",
  car_wash: "Car Wash",
  other: "Other",
};

function exportCSV(summary: ReportSummary) {
  const lines = [
    "Metric,Value",
    `Total Earnings,${summary.total_earnings}`,
    `Total Expenses,${summary.total_expenses}`,
    `Net Profit,${summary.net_profit}`,
    `Total KM,${summary.total_km}`,
    `Avg Earnings/Day,${summary.avg_earnings_per_day}`,
    `Avg Profit/Day,${summary.avg_profit_per_day}`,
    `Fuel Cost,${summary.fuel_cost}`,
    `Cost/KM,${summary.cost_per_km}`,
  ];
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gari-hisaab-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    driver_id: "",
    car_id: "",
  });

  useEffect(() => {
    async function init() {
      const [driversResult, carsResult] = await Promise.all([
        getDrivers(),
        getCars(),
      ]);
      if (driversResult.success) setDrivers(driversResult.data as Driver[]);
      if (carsResult.success) setCars(carsResult.data as Car[]);

      const reportResult = await getReportData({});
      if (reportResult.success) {
        setReportData(reportResult.data as ReportData);
      }
      setInitialLoading(false);
    }
    init();
  }, []);

  async function handleGenerate() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    if (filters.driver_id) params.driver_id = filters.driver_id;
    if (filters.car_id) params.car_id = filters.car_id;

    const result = await getReportData(params);
    if (result.success) {
      setReportData(result.data as ReportData);
      toast.success("Report generated");
    } else {
      toast.error(result.error || "Failed to generate report");
    }
    setLoading(false);
  }

  const s = reportData?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights into your car business performance"
      >
        {reportData && (
          <Button
            variant="outline"
            onClick={() => exportCSV(reportData.summary)}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">Driver</Label>
              <Select
                value={filters.driver_id || null}
                onValueChange={(val) =>
                  setFilters((f) => ({ ...f, driver_id: val ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">Car</Label>
              <Select
                value={filters.car_id || null}
                onValueChange={(val) =>
                  setFilters((f) => ({ ...f, car_id: val ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Cars" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {initialLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !reportData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No report data available. Click &quot;Generate Report&quot; to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {s && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-green-500" />
                    <span className="text-xl font-bold">
                      {formatCurrency(s.total_earnings)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="size-4 text-red-500" />
                    <span className="text-xl font-bold">
                      {formatCurrency(s.total_expenses)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign
                      className={`size-4 ${s.net_profit >= 0 ? "text-green-500" : "text-red-500"}`}
                    />
                    <span
                      className={`text-xl font-bold ${s.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(s.net_profit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Total KM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-blue-500" />
                    <span className="text-xl font-bold">
                      {s.total_km.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Avg Earnings/Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-violet-500" />
                    <span className="text-xl font-bold">
                      {formatCurrency(s.avg_earnings_per_day)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Avg Profit/Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar
                      className={`size-4 ${s.avg_profit_per_day >= 0 ? "text-green-500" : "text-red-500"}`}
                    />
                    <span
                      className={`text-xl font-bold ${s.avg_profit_per_day >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(s.avg_profit_per_day)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Fuel Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Fuel className="size-4 text-orange-500" />
                    <span className="text-xl font-bold">
                      {formatCurrency(s.fuel_cost)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">
                    Cost/KM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Gauge className="size-4 text-cyan-500" />
                    <span className="text-xl font-bold">
                      {formatCurrency(s.cost_per_km)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Earnings by Day</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.daily_breakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={reportData.daily_breakdown.map((d) => ({
                        ...d,
                        dateLabel: format(parseISO(d.date), "dd MMM"),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dateLabel"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit by Day</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.daily_breakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={reportData.daily_breakdown.map((d) => ({
                        ...d,
                        dateLabel: format(parseISO(d.date), "dd MMM"),
                        positiveProfit: d.profit > 0 ? d.profit : 0,
                        negativeProfit: d.profit < 0 ? d.profit : 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dateLabel"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="positiveProfit"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                        name="Profit"
                      />
                      <Area
                        type="monotone"
                        dataKey="negativeProfit"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.3}
                        name="Loss"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.expenses_by_category.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.expenses_by_category.map((c) => ({
                          ...c,
                          name: CATEGORY_LABELS[c.category] || c.category,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {reportData.expenses_by_category.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.driver_comparison.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.driver_comparison}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="driver_name"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>KM by Day</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.km_by_day.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={reportData.km_by_day.map((d) => ({
                        ...d,
                        dateLabel: format(parseISO(d.date), "dd MMM"),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dateLabel"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip />
                      <Bar dataKey="km" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
