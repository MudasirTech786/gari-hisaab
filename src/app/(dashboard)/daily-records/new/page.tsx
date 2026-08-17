"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  Loader2Icon,
  CalculatorIcon,
  FuelIcon,
  RouteIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { createDailyRecord } from "@/app/actions/daily-records"
import { getDrivers } from "@/app/actions/drivers"
import { getCars } from "@/app/actions/cars"
import { dailyRecordSchema, type DailyRecordInput } from "@/lib/validations"
import { formatCurrency } from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function NewDailyRecordPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [cars, setCars] = useState<{
    id: string
    name: string
    registration_number: string
  }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DailyRecordInput>({
    resolver: zodResolver(dailyRecordSchema) as never,
    defaultValues: {
      record_date: new Date().toISOString().split("T")[0],
      starting_km: 0,
      ending_km: 0,
      indrive_earnings: 0,
      cash_earnings: 0,
      online_earnings: 0,
      fuel_cost: 0,
      other_expenses: 0,
      shift_start: "",
      shift_end: "",
      notes: "",
    },
  })

  useEffect(() => {
    Promise.all([getDrivers(), getCars()]).then(([driversRes, carsRes]) => {
      if (driversRes.success && driversRes.data) setDrivers(driversRes.data)
      if (carsRes.success && carsRes.data) setCars(carsRes.data)
    })
  }, [])

  const startingKm = watch("starting_km") ?? 0
  const endingKm = watch("ending_km") ?? 0
  const indriveEarnings = watch("indrive_earnings") ?? 0
  const cashEarnings = watch("cash_earnings") ?? 0
  const onlineEarnings = watch("online_earnings") ?? 0
  const fuelCost = watch("fuel_cost") ?? 0
  const otherExpenses = watch("other_expenses") ?? 0

  const totalKm = endingKm - startingKm
  const totalEarnings = indriveEarnings + cashEarnings + onlineEarnings
  const totalExpenses = fuelCost + otherExpenses
  const netProfit = totalEarnings - totalExpenses

  const onSubmit = async (data: DailyRecordInput) => {
    setSubmitting(true)
    const result = await createDailyRecord(data)
    if (result.success) {
      toast.success("Daily record created successfully")
      router.push("/daily-records")
    } else {
      toast.error(result.error)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Daily Record" description="Log a new trip record">
        <Link href="/daily-records">
          <Button variant="outline">
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit as never)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Record Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="record_date">Date *</Label>
                  <Input
                    id="record_date"
                    type="date"
                    {...register("record_date")}
                  />
                  {errors.record_date && (
                    <p className="text-xs text-destructive">
                      {errors.record_date.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Driver *</Label>
                  <Select onValueChange={(val) => setValue("driver_id", val as string)}>
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
                  {errors.driver_id && (
                    <p className="text-xs text-destructive">
                      {errors.driver_id.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Car *</Label>
                  <Select onValueChange={(val) => setValue("car_id", val as string)}>
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
                  {errors.car_id && (
                    <p className="text-xs text-destructive">
                      {errors.car_id.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shift_start">Shift Start</Label>
                  <Input
                    id="shift_start"
                    type="time"
                    {...register("shift_start")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shift_end">Shift End</Label>
                  <Input
                    id="shift_end"
                    type="time"
                    {...register("shift_end")}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="starting_km">Starting KM *</Label>
                  <Input
                    id="starting_km"
                    type="number"
                    step="0.1"
                    min="0"
                    {...register("starting_km")}
                  />
                  {errors.starting_km && (
                    <p className="text-xs text-destructive">
                      {errors.starting_km.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ending_km">Ending KM *</Label>
                  <Input
                    id="ending_km"
                    type="number"
                    step="0.1"
                    min="0"
                    {...register("ending_km")}
                  />
                  {errors.ending_km && (
                    <p className="text-xs text-destructive">
                      {errors.ending_km.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Earnings
                </Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="indrive_earnings">InDrive</Label>
                    <Input
                      id="indrive_earnings"
                      type="number"
                      step="1"
                      min="0"
                      {...register("indrive_earnings")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cash_earnings">Cash</Label>
                    <Input
                      id="cash_earnings"
                      type="number"
                      step="1"
                      min="0"
                      {...register("cash_earnings")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="online_earnings">Online</Label>
                    <Input
                      id="online_earnings"
                      type="number"
                      step="1"
                      min="0"
                      {...register("online_earnings")}
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
                    <Label htmlFor="fuel_cost">Fuel Cost</Label>
                    <Input
                      id="fuel_cost"
                      type="number"
                      step="1"
                      min="0"
                      {...register("fuel_cost")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="other_expenses">Other Expenses</Label>
                    <Input
                      id="other_expenses"
                      type="number"
                      step="1"
                      min="0"
                      {...register("other_expenses")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes..."
                  rows={3}
                  {...register("notes")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalculatorIcon className="size-4" />
                  Live Calculations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RouteIcon className="size-3.5" />
                    Total KM
                  </span>
                  <span className="font-medium">{totalKm.toLocaleString()} km</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUpIcon className="size-3.5" />
                    Total Earnings
                  </span>
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FuelIcon className="size-3.5" />
                    Total Expenses
                  </span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(totalExpenses)}
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
                      netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(netProfit)}
                  </span>
                </div>
                {netProfit < 0 && (
                  <p className="text-xs text-destructive">
                    This record results in a loss
                  </p>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2Icon className="size-4 animate-spin" />}
              Create Record
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
