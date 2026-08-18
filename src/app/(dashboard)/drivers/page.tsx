"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Eye,
  Pencil,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getDrivers, updateDriver } from "@/app/actions/drivers";
import { getDailyRecords } from "@/app/actions/daily-records";
import { formatCurrency, DRIVER_STATUSES } from "@/lib/constants";
import type { Driver, DailyRecord } from "@/lib/types";

interface DriverStats {
  daysWorked: number;
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  avgDailyProfit: number;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [driversResult, recordsResult] = await Promise.all([
        getDrivers(),
        getDailyRecords(),
      ]);

      if (driversResult.success) {
        setDrivers(driversResult.data ?? []);
      } else {
        toast.error(driversResult.error ?? "Failed to load drivers");
      }

      if (recordsResult.success) {
        setDailyRecords(recordsResult.data as unknown as DailyRecord[]);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const driverStatsMap = useMemo(() => {
    const map = new Map<string, DriverStats>();

    for (const driver of drivers) {
      const records = dailyRecords.filter((r) => r.driver_id === driver.id);
      const daysWorked = records.length;

      let totalEarnings = 0;
      let totalExpenses = 0;

      for (const record of records) {
        totalEarnings +=
          record.indrive_earnings +
          record.cash_earnings +
          record.online_earnings;
        totalExpenses += record.fuel_cost + record.other_expenses;
      }

      const netProfit = totalEarnings - totalExpenses;
      const avgDailyProfit = daysWorked > 0 ? netProfit / daysWorked : 0;

      map.set(driver.id, {
        daysWorked,
        totalEarnings,
        totalExpenses,
        netProfit,
        avgDailyProfit,
      });
    }

    return map;
  }, [drivers, dailyRecords]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = driver.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  async function handleToggleStatus(driver: Driver) {
    const newStatus = driver.status === "active" ? "inactive" : "active";
    const result = await updateDriver(driver.id, {
      name: driver.name,
      phone: driver.phone || "",
      status: newStatus,
    });

    if (result.success) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id ? { ...d, status: newStatus } : d
        )
      );
      toast.success(
        `Driver ${newStatus === "active" ? "activated" : "deactivated"} successfully`
      );
    } else {
      toast.error(result.error ?? "Failed to update driver");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Drivers" />
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-muted-foreground">Loading drivers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers">
        <Link href="/drivers/new">
          <Button>
            <Users className="size-4" />
            Add Driver
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {DRIVER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDrivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {drivers.length === 0
                ? "No drivers yet. Add your first driver to get started."
                : "No drivers match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Worked</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Avg Daily</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => {
                    const stats = driverStatsMap.get(driver.id);
                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          {driver.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              driver.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              driver.status === "active"
                                ? "border-lime-300/15 bg-lime-300/10 text-lime-200"
                                : "border-white/8 bg-white/[.05] text-zinc-400"
                            }
                          >
                            {driver.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {stats?.daysWorked ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(stats?.totalEarnings ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(stats?.totalExpenses ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span
                            className={
                              (stats?.netProfit ?? 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(stats?.netProfit ?? 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(stats?.avgDailyProfit ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/drivers/${driver.id}`}>
                              <Button variant="ghost" size="icon-sm">
                                <Eye className="size-4" />
                              </Button>
                            </Link>
                            <Link href={`/drivers/${driver.id}?edit=true`}>
                              <Button variant="ghost" size="icon-sm">
                                <Pencil className="size-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleToggleStatus(driver)}
                            >
                              {driver.status === "active" ? (
                                <UserX className="size-4" />
                              ) : (
                                <UserCheck className="size-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredDrivers.map((driver) => {
              const stats = driverStatsMap.get(driver.id);
              return (
                <Card key={driver.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{driver.name}</CardTitle>
                      <Badge
                        variant={
                          driver.status === "active" ? "default" : "secondary"
                        }
                        className={
                          driver.status === "active"
                            ? "border-lime-300/15 bg-lime-300/10 text-lime-200"
                            : "border-white/8 bg-white/[.05] text-zinc-400"
                        }
                      >
                        {driver.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {driver.phone && (
                      <p className="text-sm text-muted-foreground">
                        {driver.phone}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>{stats?.daysWorked ?? 0} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-green-500" />
                        <span>{formatCurrency(stats?.totalEarnings ?? 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-4 text-red-500" />
                        <span>{formatCurrency(stats?.totalExpenses ?? 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet className="size-4 text-muted-foreground" />
                        <span
                          className={
                            (stats?.netProfit ?? 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatCurrency(stats?.netProfit ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <BarChart3 className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Avg/day:{" "}
                          {formatCurrency(stats?.avgDailyProfit ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 border-t pt-3">
                      <Link href={`/drivers/${driver.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="size-4" />
                          View
                        </Button>
                      </Link>
                      <Link
                        href={`/drivers/${driver.id}?edit=true`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggleStatus(driver)}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
