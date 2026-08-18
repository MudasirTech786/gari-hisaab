"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gauge,
  User,
  Users,
  Car,
  Calendar,
  Wallet,
  Target,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { formatCurrency, formatDate } from "@/lib/constants"
import { getDashboardData } from "@/app/actions/dashboard"

const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.DashboardCharts),
  { ssr: false }
)

interface DashboardData {
  today: {
    earnings: number
    expenses: number
    net_profit: number
    km: number
    current_driver: string | null
  }
  month: {
    total_earnings: number
    total_expenses: number
    net_profit: number
    total_km: number
    avg_daily_earnings: number
    avg_daily_profit: number
  }
  earnings_trend: { date: string; amount: number }[]
  profit_trend: { date: string; amount: number }[]
  driver_comparison: {
    driver_name: string
    earnings: number
    expenses: number
    profit: number
    days_worked: number
  }[]
  recent_records: {
    id: string
    driver_id: string
    record_date: string
    drivers: { name: string } | null
    cars: { name: string; registration_number: string } | null
    indrive_earnings: number
    cash_earnings: number
    online_earnings: number
    fuel_cost: number
    other_expenses: number
    starting_km: number
    ending_km: number
  }[]
  recent_expenses: {
    id: string
    expense_date: string
    category: string
    amount: number
    description: string | null
    drivers: { name: string } | null
    cars: { name: string } | null
  }[]
  fleet: {
    total_cars: number
    active_cars: number
    total_drivers: number
  }
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: "green" | "red" | "blue" | "slate" | "purple" | "amber"
}) {
  const colorMap = {
    green: "bg-lime-300/15 text-lime-700",
    red: "bg-red-500/10 text-red-600",
    blue: "bg-lime-300/15 text-lime-700",
    slate: "bg-gray-100 text-gray-600",
    purple: "bg-gray-100 text-gray-600",
    amber: "bg-lime-300/15 text-lime-700",
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="truncate text-2xl font-bold tracking-tight">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchDashboard() {
      try {
        const result = await getDashboardData()
        if (cancelled) return
        if (result.success && result.data) {
          setData(result.data as unknown as DashboardData)
        } else {
          setError(result.error || "Failed to load dashboard data")
        }
      } catch {
        if (!cancelled) setError("An unexpected error occurred")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDashboard()
    return () => { cancelled = true }
  }, [])

  const driverIdToName = useMemo(() => {
    if (!data) return new Map<string, string>()
    const map = new Map<string, string>()
    for (const record of data.recent_records) {
      if (record.driver_id && record.drivers?.name) {
        map.set(record.driver_id, record.drivers.name)
      }
    }
    return map
  }, [data])

  const resolveDriverName = (driverId: string | null): string => {
    if (!driverId) return "No driver"
    return driverIdToName.get(driverId) ?? "Unknown driver"
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Fleet overview and performance metrics"
        />
        <div>
          <h2 className="mb-4 text-lg font-semibold">Today</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">This Month</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Fleet overview and performance metrics"
        />
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-destructive">
                Error loading dashboard
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your car earnings and expenses"
      />

      {/* Fleet Overview */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-lime-300/10">
                  <Car className="size-5 text-lime-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicles</p>
                  <p className="text-xl font-bold">{data.fleet.total_cars} <span className="text-sm font-normal text-muted-foreground">({data.fleet.active_cars} active)</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                  <Users className="size-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Drivers</p>
                  <p className="text-xl font-bold">{data.fleet.total_drivers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-lime-300/15">
                  <Wallet className="size-5 text-lime-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s Profit</p>
                  <p className={`text-xl font-bold ${data.today.net_profit >= 0 ? 'text-lime-700' : 'text-red-600'}`}>
                    {formatCurrency(data.today.net_profit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Today Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Today</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={TrendingUp}
            label="Today's Earnings"
            value={formatCurrency(data.today.earnings)}
            color="green"
          />
          <StatCard
            icon={TrendingDown}
            label="Today's Expenses"
            value={formatCurrency(data.today.expenses)}
            color="red"
          />
          <StatCard
            icon={DollarSign}
            label="Net Profit"
            value={formatCurrency(data.today.net_profit)}
            color="blue"
          />
          <StatCard
            icon={Gauge}
            label="Today's KM"
            value={`${data.today.km.toLocaleString()} km`}
            color="slate"
          />
          <StatCard
            icon={User}
            label="Current Driver"
            value={resolveDriverName(data.today.current_driver)}
            color="purple"
          />
        </div>
      </section>

      {/* This Month Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          This Month
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Total Earnings"
            value={formatCurrency(data.month.total_earnings)}
            color="green"
          />
          <StatCard
            icon={TrendingDown}
            label="Total Expenses"
            value={formatCurrency(data.month.total_expenses)}
            color="red"
          />
          <StatCard
            icon={DollarSign}
            label="Net Profit"
            value={formatCurrency(data.month.net_profit)}
            color="blue"
          />
          <StatCard
            icon={Gauge}
            label="Total KM"
            value={`${data.month.total_km.toLocaleString()} km`}
            color="slate"
          />
          <StatCard
            icon={Target}
            label="Avg Daily Earnings"
            value={formatCurrency(data.month.avg_daily_earnings)}
            color="amber"
          />
          <StatCard
            icon={Wallet}
            label="Avg Daily Profit"
            value={formatCurrency(data.month.avg_daily_profit)}
            color="purple"
          />
        </div>
      </section>

      {/* Charts Section - lazy loaded */}
      <DashboardCharts
        earnings_trend={data.earnings_trend}
        profit_trend={data.profit_trend}
        driver_comparison={data.driver_comparison}
      />

      {/* Recent Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Daily Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_records.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_records.slice(0, 5).map((record) => {
                    const totalEarnings =
                      Number(record.indrive_earnings) +
                      Number(record.cash_earnings) +
                      Number(record.online_earnings)
                    const totalExpenses =
                      Number(record.fuel_cost) + Number(record.other_expenses)
                    const km =
                      Number(record.ending_km) - Number(record.starting_km)
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(record.record_date)}
                        </TableCell>
                        <TableCell>
                          {record.drivers?.name ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-right text-lime-700">
                          {formatCurrency(totalEarnings)}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {formatCurrency(totalExpenses)}
                        </TableCell>
                        <TableCell className="text-right">
                          {km.toLocaleString()} km
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">No recent records found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_expenses.slice(0, 5).map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-block capitalize">
                          {expense.category.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {expense.drivers?.name ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">No recent expenses found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Monthly Summary */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-lime-700">
                  {formatCurrency(data.month.total_earnings)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(data.month.total_expenses)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-lime-700">
                  {formatCurrency(data.month.net_profit)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total KM Driven
                </p>
                <p className="text-2xl font-bold">
                  {data.month.total_km.toLocaleString()} km
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Avg Daily Earnings
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.month.avg_daily_earnings)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Avg Daily Profit
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.month.avg_daily_profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
