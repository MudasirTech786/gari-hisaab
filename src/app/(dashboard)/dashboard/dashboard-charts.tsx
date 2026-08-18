"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import { BarChart3, Calendar, TrendingUp } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/constants"

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

function DriverChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm">
          <span className="text-muted-foreground">{entry.name}:</span>{" "}
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function formatShortDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "dd MMM")
  } catch {
    return dateStr
  }
}

interface DashboardChartsProps {
  earnings_trend: { date: string; amount: number }[]
  profit_trend: { date: string; amount: number }[]
  driver_comparison: {
    driver_name: string
    earnings: number
    expenses: number
    profit: number
    days_worked: number
  }[]
}

export function DashboardCharts({
  earnings_trend,
  profit_trend,
  driver_comparison,
}: DashboardChartsProps) {
  const earningsChartData = earnings_trend.map((d) => ({
    date: formatShortDate(d.date),
    amount: d.amount,
  }))

  const profitChartData = profit_trend.map((d) => ({
    date: formatShortDate(d.date),
    amount: d.amount,
  }))

  return (
    <>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earnings_trend.some((d) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={earningsChartData}>
                  <defs>
                    <linearGradient
                      id="earningsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#b8ff2c"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#b8ff2c"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      `Rs ${value.toLocaleString()}`
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#b8ff2c"
                    strokeWidth={2}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No earnings data for the last 30 days" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Net Profit Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profit_trend.some((d) => d.amount !== 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={profitChartData}>
                  <defs>
                    <linearGradient
                      id="profitGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#b8ff2c"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#b8ff2c"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      `Rs ${value.toLocaleString()}`
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#b8ff2c"
                    strokeWidth={2}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No profit data for the last 30 days" />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Driver Comparison */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Driver Comparison (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driver_comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={driver_comparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="driver_name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      `Rs ${value.toLocaleString()}`
                    }
                  />
                  <Tooltip content={<DriverChartTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="earnings"
                    name="Earnings"
                    fill="#b8ff2c"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="Profit"
                    fill="#b8ff2c"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No driver data available" />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
