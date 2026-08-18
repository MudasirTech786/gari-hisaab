"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  CalendarIcon,
  CarIcon,
  UserIcon,
  InboxIcon,
  Loader2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { getDailyRecords, deleteDailyRecord } from "@/app/actions/daily-records"
import { getDrivers } from "@/app/actions/drivers"
import { getCars } from "@/app/actions/cars"
import { formatCurrency, formatDate } from "@/lib/constants"
import type { DailyRecord } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface JoinedRecord extends DailyRecord {
  cars: { name: string; registration_number: string } | null
  drivers: { name: string } | null
}

interface Filters {
  start_date: string
  end_date: string
  driver_id: string
  car_id: string
}

function calculateTotals(record: DailyRecord) {
  const total_km = record.ending_km - record.starting_km
  const total_earnings =
    record.indrive_earnings + record.cash_earnings + record.online_earnings
  const total_expenses = record.fuel_cost + record.other_expenses
  const net_profit = total_earnings - total_expenses
  return { total_km, total_earnings, total_expenses, net_profit }
}

export default function DailyRecordsPage() {
  const [records, setRecords] = useState<JoinedRecord[]>([])
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [cars, setCars] = useState<{
    id: string
    name: string
    registration_number: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    start_date: "",
    end_date: "",
    driver_id: "",
    car_id: "",
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRecords = useCallback(async (f: Filters) => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (f.start_date) params.start_date = f.start_date
    if (f.end_date) params.end_date = f.end_date
    if (f.driver_id) params.driver_id = f.driver_id
    if (f.car_id) params.car_id = f.car_id

    const result = await getDailyRecords(params)
    if (result.success) {
      setRecords(result.data as unknown as JoinedRecord[])
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const [driversRes, carsRes] = await Promise.all([getDrivers(), getCars()])
      if (driversRes.success && driversRes.data) setDrivers(driversRes.data)
      if (carsRes.success && carsRes.data) setCars(carsRes.data)
      await fetchRecords(filters)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    fetchRecords(next)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    const result = await deleteDailyRecord(deletingId)
    if (result.success) {
      toast.success("Record deleted successfully")
      setRecords((prev) => prev.filter((r) => r.id !== deletingId))
    } else {
      toast.error(result.error)
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Records" description="Manage your daily trip records">
        <Link href="/daily-records/new">
          <Button>
            <PlusIcon className="size-4" />
            Add Record
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">
            <CalendarIcon className="inline size-3 mr-1" />
            Start Date
          </Label>
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange("start_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            <CalendarIcon className="inline size-3 mr-1" />
            End Date
          </Label>
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange("end_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            <UserIcon className="inline size-3 mr-1" />
            Driver
          </Label>
          <Select
            value={filters.driver_id}
            onValueChange={(val) => handleFilterChange("driver_id", val ?? "")}
            items={drivers.map((d) => ({ value: d.id, label: d.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All drivers" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id} label={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            <CarIcon className="inline size-3 mr-1" />
            Car
          </Label>
          <Select
            value={filters.car_id}
            onValueChange={(val) => handleFilterChange("car_id", val ?? "")}
            items={cars.map((c) => ({ value: c.id, label: `${c.name} (${c.registration_number})` }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All cars" />
            </SelectTrigger>
            <SelectContent>
              {cars.map((c) => (
                <SelectItem key={c.id} value={c.id} label={`${c.name} (${c.registration_number})`}>
                  {c.name} ({c.registration_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <InboxIcon className="size-12 mb-3" />
          <p className="text-lg font-medium">No records found</p>
          <p className="text-sm">Try adjusting your filters or add a new record.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Starting KM</TableHead>
                  <TableHead>Ending KM</TableHead>
                  <TableHead>Total KM</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const { total_km, total_earnings, total_expenses, net_profit } =
                    calculateTotals(record)
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.record_date)}</TableCell>
                      <TableCell>{record.drivers?.name ?? "—"}</TableCell>
                      <TableCell>{record.starting_km.toLocaleString()}</TableCell>
                      <TableCell>{record.ending_km.toLocaleString()}</TableCell>
                      <TableCell>{total_km.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(total_earnings)}</TableCell>
                      <TableCell>{formatCurrency(total_expenses)}</TableCell>
                      <TableCell
                        className={net_profit >= 0 ? "text-emerald-600" : "text-red-600"}
                      >
                        {formatCurrency(net_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Link href={`/daily-records/${record.id}`}>
                            <Button variant="ghost" size="icon-sm">
                              <EyeIcon className="size-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/daily-records/${record.id}?edit=true`}>
                            <Button variant="ghost" size="icon-sm">
                              <PencilIcon className="size-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setDeletingId(record.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2Icon className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {records.map((record) => {
              const { total_km, total_earnings, total_expenses, net_profit } =
                calculateTotals(record)
              return (
                <Card key={record.id}>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(record.record_date)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {record.cars?.name ?? "—"}
                      </span>
                    </div>
                    <p className="font-medium">{record.drivers?.name ?? "—"}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">KM: </span>
                        {record.starting_km.toLocaleString()} → {record.ending_km.toLocaleString()}{" "}
                        <span className="text-muted-foreground">({total_km.toLocaleString()})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Earnings: </span>
                        {formatCurrency(total_earnings)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expenses: </span>
                        {formatCurrency(total_expenses)}
                      </div>
                      <div className={net_profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                        <span className="text-muted-foreground">Net: </span>
                        {formatCurrency(net_profit)}
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 pt-1">
                      <Link href={`/daily-records/${record.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <EyeIcon className="size-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/daily-records/${record.id}?edit=true`}>
                        <Button variant="ghost" size="icon-sm">
                          <PencilIcon className="size-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setDeletingId(record.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2Icon className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingId(null)
              }}
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
