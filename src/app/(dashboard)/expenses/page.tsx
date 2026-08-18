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
  Fuel,
  Wrench,
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
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/app/actions/expenses";
import { getDrivers } from "@/app/actions/drivers";
import { getCars } from "@/app/actions/cars";
import { expenseSchema, type ExpenseInput } from "@/lib/validations";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Expense, Driver, Car, ExpenseCategory } from "@/lib/types";

type ExpenseWithRelations = Expense & {
  cars: { name: string; registration_number: string } | null;
  drivers: { name: string } | null;
};

const CATEGORY_BADGE_COLORS: Record<ExpenseCategory, string> = {
  fuel: "border-lime-300/15 bg-lime-300/10 text-lime-200",
  maintenance:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  oil: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  tire: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  parking:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  toll: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  car_wash:
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
  other:
    "border-white/8 bg-white/[.05] text-zinc-400",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  maintenance: "Maintenance",
  oil: "Oil",
  tire: "Tire",
  parking: "Parking",
  toll: "Toll",
  car_wash: "Car Wash",
  other: "Other",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<ExpenseWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] =
    useState<ExpenseWithRelations | null>(null);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    driver_id: "",
    category: "" as ExpenseCategory | "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      car_id: "",
      driver_id: "",
      daily_record_id: null,
      expense_date: "",
      category: "fuel",
      amount: 0,
      description: "",
    },
  });

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.category) params.category = filters.category;

      const result = await getExpenses(params);
      if (result.success) {
        setExpenses(result.data as unknown as ExpenseWithRelations[]);
      } else {
        toast.error(result.error || "Failed to fetch expenses");
      }
      setLoading(false);
    }
    fetchExpenses();
  }, [filters.start_date, filters.end_date, filters.driver_id, filters.category, refreshKey]);

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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fuelExpenses = expenses
    .filter((e) => e.category === "fuel")
    .reduce((sum, e) => sum + e.amount, 0);
  const maintenanceExpenses = expenses
    .filter((e) => e.category === "maintenance")
    .reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses = expenses
    .filter((e) => e.category !== "fuel" && e.category !== "maintenance")
    .reduce((sum, e) => sum + e.amount, 0);

  function openCreateDialog() {
    setEditingExpense(null);
    form.reset({
      car_id: "",
      driver_id: "",
      daily_record_id: null,
      expense_date: "",
      category: "fuel",
      amount: 0,
      description: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(expense: ExpenseWithRelations) {
    setEditingExpense(expense);
    form.reset({
      car_id: expense.car_id,
      driver_id: expense.driver_id,
      daily_record_id: expense.daily_record_id,
      expense_date: expense.expense_date,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || "",
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(expense: ExpenseWithRelations) {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  }

  async function onSubmit(data: ExpenseInput) {
    setSubmitting(true);
    try {
      const result = editingExpense
        ? await updateExpense(editingExpense.id, data)
        : await createExpense(data);
      if (result.success) {
        toast.success(
          editingExpense ? "Expense updated" : "Expense created"
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
    if (!deletingExpense) return;
    const result = await deleteExpense(deletingExpense.id);
    if (result.success) {
      toast.success("Expense deleted");
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
      setRefreshKey((k) => k + 1);
    } else {
      toast.error(result.error || "Failed to delete expense");
    }
  }

  function clearFilters() {
    setFilters({
      start_date: "",
      end_date: "",
      driver_id: "",
      category: "",
    });
  }

  const hasFilters =
    filters.start_date ||
    filters.end_date ||
    filters.driver_id ||
    filters.category;

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track and manage all your expenses">
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Expense
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-red-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Fuel Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Fuel className="size-4 text-lime-300" />
              <span className="text-2xl font-bold">
                {formatCurrency(fuelExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="size-4 text-orange-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(maintenanceExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Other Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-zinc-400" />
              <span className="text-2xl font-bold">
                {formatCurrency(otherExpenses)}
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
              <Label className="text-xs">Category</Label>
              <Select
                value={filters.category || null}
                onValueChange={(val) =>
                  setFilters((f) => ({
                    ...f,
                    category: (val as ExpenseCategory) ?? "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
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
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No expenses found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openCreateDialog}
            >
              <Plus className="size-3" />
              Add your first expense
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
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.drivers?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CATEGORY_BADGE_COLORS[expense.category]}
                        >
                          {CATEGORY_LABELS[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {expense.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDeleteDialog(expense)}
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
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(expense.expense_date)}
                    </span>
                    <Badge
                      variant="outline"
                      className={CATEGORY_BADGE_COLORS[expense.category]}
                    >
                      {CATEGORY_LABELS[expense.category]}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(expense.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {expense.drivers?.name || "—"}
                  </div>
                  {expense.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {expense.description}
                    </div>
                  )}
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(expense)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDeleteDialog(expense)}
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
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Update the expense details below."
                : "Enter the details for the new expense."}
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
                <Input type="date" {...form.register("expense_date")} />
                {form.formState.errors.expense_date && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.expense_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) =>
                        field.onChange(val as ExpenseCategory)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
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
                {editingExpense ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense of{" "}
              <span className="font-medium text-foreground">
                {deletingExpense && formatCurrency(deletingExpense.amount)}
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
