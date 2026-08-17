"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  RouteIcon,
  TrendingUpIcon,
  FuelIcon,
  WalletIcon,
  ClockIcon,
  CarIcon,
  UserIcon,
  SaveIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  getDailyRecordById,
  updateDailyRecord,
  deleteDailyRecord,
} from "@/app/actions/daily-records"
import { getDrivers } from "@/app/actions/drivers"
import { getCars } from "@/app/actions/cars"
import type { DailyRecordInput } from "@/lib/validations"
import { formatCurrency, formatDate } from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface JoinedRecord {
  id: string
  car_id: string
  driver_id: string
  record_date: string
  shift_start: string | null
  shift_end: string | null
  starting_km: number
  ending_km: number
  indrive_earnings: number
  cash_earnings: number
  online_earnings: number
  fuel_cost: number
  other_expenses: number
  notes: string | null
  created_at: string
  updated_at: string
  cars: { name: string; registration_number: string } | null
  drivers: { name: string } | null
}

function calculateTotals(record: JoinedRecord) {
  const total_km = record.ending_km - record.starting_km
  const total_earnings =
    record.indrive_earnings + record.cash_earnings + record.online_earnings
  const total_expenses = record.fuel_cost + record.other_expenses
  const net_profit = total_earnings - total_expenses
  return { total_km, total_earnings, total_expenses, net_profit }
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${className ?? ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export default function DailyRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEdit = searchParams.get("edit") === "true"

  const [record, setRecord] = useState<JoinedRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(initialEdit)
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [cars, setCars] = useState<{
    id: string
    name: string
    registration_number: string
  }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    car_id: "",
    driver_id: "",
    record_date: "",
    shift_start: "",
    shift_end: "",
    starting_km: 0,
    ending_km: 0,
    indrive_earnings: 0,
    cash_earnings: 0,
    online_earnings: 0,
    fuel_cost: 0,
    other_expenses: 0,
    notes: "",
  })

  const fetchRecord = useCallback(async () => {
    setLoading(true)
    const result = await getDailyRecordById(id)
    if (result.success && result.data) {
      const r = result.data as JoinedRecord
      setRecord(r)
      setForm({
        car_id: r.car_id,
        driver_id: r.driver_id,
        record_date: r.record_date,
        shift_start: r.shift_start ?? "",
        shift_end: r.shift_end ?? "",
        starting_km: r.starting_km,
        ending_km: r.ending_km,
        indrive_earnings: r.indrive_earnings,
        cash_earnings: r.cash_earnings,
        online_earnings: r.online_earnings,
        fuel_cost: r.fuel_cost,
        other_expenses: r.other_expenses,
        notes: r.notes ?? "",
      })
    } else {
      toast.error(result.error ?? "Failed to load record")
      router.push("/daily-records")
    }
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    async function init() {
      const [driversRes, carsRes] = await Promise.all([getDrivers(), getCars()])
      if (driversRes.success && driversRes.data) setDrivers(driversRes.data)
      if (carsRes.success && carsRes.data) setCars(carsRes.data)
      await fetchRecord()
    }
    init()
  }, [fetchRecord])

  const updateForm = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpdate = async () => {
    setSubmitting(true)
    const result = await updateDailyRecord(id, form as DailyRecordInput)
    if (result.success) {
      toast.success("Record updated successfully")
      setEditMode(false)
      await fetchRecord()
    } else {
      toast.error(result.error)
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteDailyRecord(id)
    if (result.success) {
      toast.success("Record deleted successfully")
      router.push("/daily-records")
    } else {
      toast.error(result.error)
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!record) return null

  const { total_km, total_earnings, total_expenses, net_profit } =
    calculateTotals(record)

  const formTotals = {
    total_km: form.ending_km - form.starting_km,
    total_earnings:
      form.indrive_earnings + form.cash_earnings + form.online_earnings,
    total_expenses: form.fuel_cost + form.other_expenses,
    net_profit:
      form.indrive_earnings +
      form.cash_earnings +
      form.online_earnings -
      (form.fuel_cost + form.other_expenses),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editMode ? "Edit Record" : "Record Details"}
        description={`${formatDate(record.record_date)} — ${record.drivers?.name ?? "Unknown"} — ${record.cars?.name ?? "Unknown"}`}
      >
        <div className="flex gap-2">
          <Link href="/daily-records">
            <Button variant="outline">
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          </Link>
          {!editMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
              >
                <PencilIcon className="size-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon className="size-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Record Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.record_date}
                      onChange={(e) => updateForm("record_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Driver *</Label>
                    <Select
                      value={form.driver_id}
                      onValueChange={(val) => updateForm("driver_id", val ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Car *</Label>
                    <Select
                      value={form.car_id}
                      onValueChange={(val) => updateForm("car_id", val ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select car" />
                      </SelectTrigger>
                      <SelectContent>
                        {cars.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.registration_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift Start</Label>
                    <Input
                      type="time"
                      value={form.shift_start}
                      onChange={(e) => updateForm("shift_start", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift End</Label>
                    <Input
                      type="time"
                      value={form.shift_end}
                      onChange={(e) => updateForm("shift_end", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Starting KM</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.starting_km}
                      onChange={(e) =>
                        updateForm("starting_km", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ending KM</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.ending_km}
                      onChange={(e) =>
                        updateForm("ending_km", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Earnings
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>InDrive</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={form.indrive_earnings}
                        onChange={(e) =>
                          updateForm(
                            "indrive_earnings",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cash</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={form.cash_earnings}
                        onChange={(e) =>
                          updateForm(
                            "cash_earnings",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Online</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={form.online_earnings}
                        onChange={(e) =>
                          updateForm(
                            "online_earnings",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Expenses
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Fuel Cost</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={form.fuel_cost}
                        onChange={(e) =>
                          updateForm("fuel_cost", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Other Expenses</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={form.other_expenses}
                        onChange={(e) =>
                          updateForm(
                            "other_expenses",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={submitting}>
                    {submitting && (
                      <Loader2Icon className="size-4 animate-spin" />
                    )}
                    <SaveIcon className="size-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      if (record) {
                        setForm({
                          car_id: record.car_id,
                          driver_id: record.driver_id,
                          record_date: record.record_date,
                          shift_start: record.shift_start ?? "",
                          shift_end: record.shift_end ?? "",
                          starting_km: record.starting_km,
                          ending_km: record.ending_km,
                          indrive_earnings: record.indrive_earnings,
                          cash_earnings: record.cash_earnings,
                          online_earnings: record.online_earnings,
                          fuel_cost: record.fuel_cost,
                          other_expenses: record.other_expenses,
                          notes: record.notes ?? "",
                        })
                      }
                    }}
                  >
                    <XIcon className="size-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                <div className="grid gap-4 py-3 sm:grid-cols-2">
                  <DetailRow
                    label="Date"
                    value={formatDate(record.record_date)}
                  />
                  <DetailRow
                    label="Driver"
                    value={
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="size-3.5 text-muted-foreground" />
                        {record.drivers?.name ?? "—"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Car"
                    value={
                      <span className="flex items-center gap-1.5">
                        <CarIcon className="size-3.5 text-muted-foreground" />
                        {record.cars?.name ?? "—"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Registration"
                    value={
                      <Badge variant="secondary">
                        {record.cars?.registration_number ?? "—"}
                      </Badge>
                    }
                  />
                </div>
                <div className="grid gap-4 py-3 sm:grid-cols-2">
                  <DetailRow
                    label="Shift Start"
                    value={
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5 text-muted-foreground" />
                        {record.shift_start || "—"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Shift End"
                    value={
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5 text-muted-foreground" />
                        {record.shift_end || "—"}
                      </span>
                    }
                  />
                </div>
                <div className="grid gap-4 py-3 sm:grid-cols-3">
                  <DetailRow
                    label="Starting KM"
                    value={record.starting_km.toLocaleString()}
                  />
                  <DetailRow
                    label="Ending KM"
                    value={record.ending_km.toLocaleString()}
                  />
                  <DetailRow
                    label="Total KM"
                    value={
                      <span className="flex items-center gap-1.5">
                        <RouteIcon className="size-3.5 text-muted-foreground" />
                        {total_km.toLocaleString()} km
                      </span>
                    }
                  />
                </div>
                <div className="grid gap-4 py-3 sm:grid-cols-3">
                  <DetailRow
                    label="InDrive Earnings"
                    value={formatCurrency(record.indrive_earnings)}
                  />
                  <DetailRow
                    label="Cash Earnings"
                    value={formatCurrency(record.cash_earnings)}
                  />
                  <DetailRow
                    label="Online Earnings"
                    value={formatCurrency(record.online_earnings)}
                  />
                </div>
                <div className="grid gap-4 py-3 sm:grid-cols-2">
                  <DetailRow
                    label="Fuel Cost"
                    value={formatCurrency(record.fuel_cost)}
                  />
                  <DetailRow
                    label="Other Expenses"
                    value={formatCurrency(record.other_expenses)}
                  />
                </div>
                {record.notes && (
                  <div className="py-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{record.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <WalletIcon className="size-4" />
                {editMode ? "Updated Totals" : "Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editMode ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RouteIcon className="size-3.5" />
                      Total KM
                    </span>
                    <span className="font-medium">
                      {formTotals.total_km.toLocaleString()} km
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUpIcon className="size-3.5" />
                      Total Earnings
                    </span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(formTotals.total_earnings)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FuelIcon className="size-3.5" />
                      Total Expenses
                    </span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(formTotals.total_expenses)}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <WalletIcon className="size-3.5" />
                      Net Profit
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        formTotals.net_profit >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(formTotals.net_profit)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RouteIcon className="size-3.5" />
                      Total KM
                    </span>
                    <span className="font-medium">
                      {total_km.toLocaleString()} km
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUpIcon className="size-3.5" />
                      Total Earnings
                    </span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(total_earnings)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FuelIcon className="size-3.5" />
                      Total Expenses
                    </span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(total_expenses)}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <WalletIcon className="size-3.5" />
                      Net Profit
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        net_profit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(net_profit)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record for{" "}
              <strong>{formatDate(record.record_date)}</strong>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
