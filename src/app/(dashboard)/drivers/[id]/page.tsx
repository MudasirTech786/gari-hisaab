"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  UserX,
  UserCheck,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  BarChart3,
  DollarSign,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getDriverById, updateDriver } from "@/app/actions/drivers";
import { getDailyRecords } from "@/app/actions/daily-records";
import { formatCurrency, formatDate, DRIVER_STATUSES } from "@/lib/constants";
import { driverSchema, type DriverInput } from "@/lib/validations";
import type { Driver, DailyRecord } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface MonthlyStats {
  month: string;
  monthLabel: string;
  earnings: number;
  expenses: number;
  netProfit: number;
  daysWorked: number;
  totalKm: number;
}

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DriverInput>({
    resolver: zodResolver(driverSchema),
  });

  const editStatusValue = watch("status");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [driverResult, recordsResult] = await Promise.all([
        getDriverById(driverId),
        getDailyRecords({ driver_id: driverId }),
      ]);

      if (driverResult.success && driverResult.data) {
        setDriver(driverResult.data);
        reset({
          name: driverResult.data.name,
          phone: driverResult.data.phone || "",
          status: driverResult.data.status,
        });
      } else {
        toast.error(driverResult.error ?? "Failed to load driver");
        router.push("/drivers");
        return;
      }

      if (recordsResult.success) {
        setDailyRecords(recordsResult.data ?? []);
      }

      setLoading(false);
    }

    fetchData();
  }, [driverId, router, reset]);

  const stats = useMemo(() => {
    let totalEarnings = 0;
    let totalExpenses = 0;
    let totalKm = 0;

    for (const record of dailyRecords) {
      totalEarnings +=
        record.indrive_earnings + record.cash_earnings + record.online_earnings;
      totalExpenses += record.fuel_cost + record.other_expenses;
      totalKm += Math.max(0, record.ending_km - record.starting_km);
    }

    const daysWorked = dailyRecords.length;
    const netProfit = totalEarnings - totalExpenses;
    const avgEarningsPerDay = daysWorked > 0 ? totalEarnings / daysWorked : 0;
    const avgProfitPerDay = daysWorked > 0 ? netProfit / daysWorked : 0;

    return {
      totalEarnings,
      totalExpenses,
      netProfit,
      totalKm,
      daysWorked,
      avgEarningsPerDay,
      avgProfitPerDay,
    };
  }, [dailyRecords]);

  const monthlyData = useMemo((): MonthlyStats[] => {
    const monthMap = new Map<string, MonthlyStats>();

    for (const record of dailyRecords) {
      const date = parseISO(record.record_date);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy");

      const earnings =
        record.indrive_earnings +
        record.cash_earnings +
        record.online_earnings;
      const expenses = record.fuel_cost + record.other_expenses;
      const km = Math.max(0, record.ending_km - record.starting_km);

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.earnings += earnings;
        existing.expenses += expenses;
        existing.netProfit += earnings - expenses;
        existing.daysWorked += 1;
        existing.totalKm += km;
      } else {
        monthMap.set(monthKey, {
          month: monthKey,
          monthLabel,
          earnings,
          expenses,
          netProfit: earnings - expenses,
          daysWorked: 1,
          totalKm: km,
        });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );
  }, [dailyRecords]);

  const chartData = useMemo(() => {
    return [...monthlyData].reverse().map((m) => ({
      name: m.monthLabel,
      earnings: m.earnings,
      expenses: m.expenses,
      profit: m.netProfit,
    }));
  }, [monthlyData]);

  async function onEditSubmit(data: DriverInput) {
    if (!driver) return;
    setIsSubmitting(true);
    const result = await updateDriver(driver.id, data);
    setIsSubmitting(false);

    if (result.success) {
      setDriver((prev) =>
        prev
          ? {
              ...prev,
              name: data.name,
              phone: data.phone || "",
              status: data.status,
            }
          : prev
      );
      reset(data);
      setEditOpen(false);
      toast.success("Driver updated successfully");
    } else {
      toast.error(result.error ?? "Failed to update driver");
    }
  }

  async function handleToggleStatus() {
    if (!driver) return;
    const newStatus = driver.status === "active" ? "inactive" : "active";
    const result = await updateDriver(driver.id, {
      name: driver.name,
      phone: driver.phone || "",
      status: newStatus,
    });

    if (result.success) {
      setDriver((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      reset({
        name: driver.name,
        phone: driver.phone || "",
        status: newStatus,
      });
      toast.success(
        `Driver ${newStatus === "active" ? "activated" : "deactivated"} successfully`
      );
    } else {
      toast.error(result.error ?? "Failed to update driver");
    }
  }

  if (loading || !driver) {
    return (
      <div className="space-y-6">
        <PageHeader title="Driver Details" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Driver Details">
        <div className="flex items-center gap-2">
          <Link href="/drivers">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant={driver.status === "active" ? "destructive" : "outline"}
            onClick={handleToggleStatus}
          >
            {driver.status === "active" ? (
              <>
                <UserX className="size-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="size-4" />
                Activate
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{driver.name}</h2>
              {driver.phone && (
                <p className="text-sm text-muted-foreground">{driver.phone}</p>
              )}
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    driver.status === "active" ? "default" : "secondary"
                  }
                  className={
                    driver.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }
                >
                  {driver.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Joined {formatDate(driver.created_at)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="size-4" />
              Total Earnings
            </div>
            <p className="mt-1 text-lg font-bold text-green-600">
              {formatCurrency(stats.totalEarnings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="size-4" />
              Total Expenses
            </div>
            <p className="mt-1 text-lg font-bold text-red-600">
              {formatCurrency(stats.totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" />
              Net Profit
            </div>
            <p
              className={`mt-1 text-lg font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(stats.netProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              Total KM
            </div>
            <p className="mt-1 text-lg font-bold">
              {stats.totalKm.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              Days Worked
            </div>
            <p className="mt-1 text-lg font-bold">{stats.daysWorked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="size-4" />
              Avg Earnings/Day
            </div>
            <p className="mt-1 text-lg font-bold text-green-600">
              {formatCurrency(stats.avgEarningsPerDay)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="size-4" />
              Avg Profit/Day
            </div>
            <p
              className={`mt-1 text-lg font-bold ${stats.avgProfitPerDay >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(stats.avgProfitPerDay)}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === "earnings"
                        ? "Earnings"
                        : name === "expenses"
                          ? "Expenses"
                          : "Profit",
                    ]}
                  />
                  <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm bg-green-500" />
                Earnings
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm bg-red-500" />
                Expenses
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm bg-blue-500" />
                Profit
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">KM</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">
                      {month.monthLabel}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.daysWorked}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.totalKm.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(month.earnings)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(month.expenses)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          month.netProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatCurrency(month.netProfit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter driver name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="Enter phone number (optional)"
                {...register("phone")}
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={editStatusValue}
                onValueChange={(val) =>
                  setValue("status", (val ?? "active") as "active" | "inactive")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
