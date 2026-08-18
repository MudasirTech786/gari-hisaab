"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  DollarSign,
  TrendingUp,
  Wallet,
  Loader2,
  Inbox,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getEarnings,
  createEarning,
  updateEarning,
  deleteEarning,
} from "@/app/actions/earnings";
import { getDrivers } from "@/app/actions/drivers";
import { getCars } from "@/app/actions/cars";
import { earningSchema, type EarningInput } from "@/lib/validations";
import { formatCurrency, formatDate, EARNING_SOURCES } from "@/lib/constants";
import type { Earning, Driver, Car, EarningSource } from "@/lib/types";

type EarningWithRelations = Earning & {
  cars: { name: string; registration_number: string } | null;
  drivers: { name: string } | null;
};

const SOURCE_COLORS: Record<EarningSource, string> = {
  indrive: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  other: "border-white/8 bg-white/[.05] text-zinc-400",
};

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningWithRelations[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEarning, setEditingEarning] =
    useState<EarningWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEarning, setDeletingEarning] =
    useState<EarningWithRelations | null>(null);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    driver_id: "",
    source: "" as EarningSource | "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const form = useForm<EarningInput>({
    resolver: zodResolver(earningSchema),
    defaultValues: {
      car_id: "",
      driver_id: "",
      daily_record_id: null,
      earning_date: "",
      source: "indrive",
      amount: 0,
      description: "",
    },
  });

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.driver_id) params.driver_id = filters.driver_id;

      const result = await getEarnings(params);
      if (result.success) {
        let data = result.data as unknown as EarningWithRelations[];
        if (filters.source) {
          data = data.filter((e) => e.source === filters.source);
        }
        setEarnings(data);
      } else {
        toast.error(result.error || "Failed to fetch earnings");
      }
      setLoading(false);
    }
    fetchEarnings();
  }, [filters.start_date, filters.end_date, filters.driver_id, filters.source, refreshKey]);

  useEffect(() => {
    async function loadReferences() {
      const [driversResult, carsResult] = await Promise.all([
        getDrivers(),
        getCars(),
      ]);
      if (driversResult.success) setDrivers(driversResult.data as Driver[]);
      if (carsResult.success) setCars(carsResult.data as Car[]);
    }
    loadReferences();
  }, []);

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const indriveEarnings = earnings
    .filter((e) => e.source === "indrive")
    .reduce((sum, e) => sum + e.amount, 0);
  const otherEarnings = earnings
    .filter((e) => e.source === "other")
    .reduce((sum, e) => sum + e.amount, 0);

  function openCreateDialog() {
    setEditingEarning(null);
    form.reset({
      car_id: "",
      driver_id: "",
      daily_record_id: null,
      earning_date: "",
      source: "indrive",
      amount: 0,
      description: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(earning: EarningWithRelations) {
    setEditingEarning(earning);
    form.reset({
      car_id: earning.car_id,
      driver_id: earning.driver_id,
      daily_record_id: earning.daily_record_id,
      earning_date: earning.earning_date,
      source: earning.source,
      amount: earning.amount,
      description: earning.description || "",
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(earning: EarningWithRelations) {
    setDeletingEarning(earning);
    setDeleteDialogOpen(true);
  }

  async function onSubmit(data: EarningInput) {
    setSubmitting(true);
    try {
      const result = editingEarning
        ? await updateEarning(editingEarning.id, data)
        : await createEarning(data);
      if (result.success) {
        toast.success(
          editingEarning ? "Earning updated" : "Earning created"
        );
        setDialogOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingEarning) return;
    const result = await deleteEarning(deletingEarning.id);
    if (result.success) {
      toast.success("Earning deleted");
      setDeleteDialogOpen(false);
      setDeletingEarning(null);
      setRefreshKey((k) => k + 1);
    } else {
      toast.error(result.error || "Failed to delete earning");
    }
  }

  function clearFilters() {
    setFilters({
      start_date: "",
      end_date: "",
      driver_id: "",
      source: "",
    });
  }

  const hasFilters =
    filters.start_date || filters.end_date || filters.driver_id || filters.source;

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="Track and manage all your earnings">
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Earning
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-green-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(totalEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              InDrive Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-violet-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(indriveEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Other Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-lime-300" />
              <span className="text-2xl font-bold">
                {formatCurrency(otherEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

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
                items={drivers.map((driver) => ({ value: driver.id, label: driver.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id} label={driver.name}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Source</Label>
              <Select
                value={filters.source || null}
                onValueChange={(val) =>
                  setFilters((f) => ({
                    ...f,
                    source: (val as EarningSource) ?? "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  {EARNING_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : earnings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No earnings found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openCreateDialog}
            >
              <Plus className="size-3" />
              Add your first earning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{formatDate(earning.earning_date)}</TableCell>
                      <TableCell>{earning.drivers?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SOURCE_COLORS[earning.source]}
                        >
                          {earning.source === "indrive" ? "InDrive" : "Other"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(earning.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {earning.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(earning)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDeleteDialog(earning)}
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-3 md:hidden">
            {earnings.map((earning) => (
              <Card key={earning.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(earning.earning_date)}
                    </span>
                    <Badge
                      variant="outline"
                      className={SOURCE_COLORS[earning.source]}
                    >
                      {earning.source === "indrive" ? "InDrive" : "Other"}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(earning.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {earning.drivers?.name || "—"}
                  </div>
                  {earning.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {earning.description}
                    </div>
                  )}
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(earning)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDeleteDialog(earning)}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEarning ? "Edit Earning" : "Add Earning"}
            </DialogTitle>
            <DialogDescription>
              {editingEarning
                ? "Update the earning details below."
                : "Enter the details for the new earning."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <Controller
                control={form.control}
                name="driver_id"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(val) => field.onChange(val ?? "")}
                    items={drivers.map((driver) => ({ value: driver.id, label: driver.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id} label={driver.name}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.driver_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.driver_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Car</Label>
              <Controller
                control={form.control}
                name="car_id"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(val) => field.onChange(val ?? "")}
                    items={cars.map((car) => ({ value: car.id, label: `${car.name} (${car.registration_number})` }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select car" />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((car) => (
                        <SelectItem key={car.id} value={car.id} label={`${car.name} (${car.registration_number})`}>
                          {car.name} ({car.registration_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.car_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.car_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...form.register("earning_date")} />
                {form.formState.errors.earning_date && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.earning_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Controller
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) =>
                        field.onChange(val as EarningSource)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EARNING_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (Rs)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                {...form.register("description")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {editingEarning ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Earning</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this earning of{" "}
              <span className="font-medium text-foreground">
                {deletingEarning && formatCurrency(deletingEarning.amount)}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
