"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Users, Car, TrendingUp, AlertTriangle } from "lucide-react"
import { formatDateTime } from "@/lib/constants"
import type { Workspace } from "@/lib/types"

interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  suspendedCustomers: number
  totalVehicles: number
}

interface EnrichedWorkspace extends Workspace {
  profile_email: string
  profile_name: string
  vehicle_count: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    suspendedCustomers: 0,
    totalVehicles: 0,
  })
  const [recentWorkspaces, setRecentWorkspaces] = useState<EnrichedWorkspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchStats() {
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name, slug, owner_id, status, created_at, updated_at")

      const { data: vehicles } = await supabase
        .from("cars")
        .select("id")

      const active = workspaces?.filter((w) => w.status === "active") || []
      const suspended = workspaces?.filter((w) => w.status === "suspended") || []

      setStats({
        totalCustomers: workspaces?.length || 0,
        activeCustomers: active.length,
        suspendedCustomers: suspended.length,
        totalVehicles: vehicles?.length || 0,
      })

      const recent = (workspaces || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      const enriched: EnrichedWorkspace[] = []

      for (const ws of recent) {
        const { data: ownerMembership } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", ws.id)
          .eq("role", "owner")
          .single()

        const { data: profile } = ownerMembership
          ? await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("user_id", ownerMembership.user_id)
              .single()
          : { data: null }

        const { count: vehicleCount } = await supabase
          .from("cars")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id)

        enriched.push({
          ...ws,
          profile_email: profile?.email || "—",
          profile_name: profile?.full_name || "—",
          vehicle_count: vehicleCount || 0,
        })
      }

      setRecentWorkspaces(enriched)
      setLoading(false)
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20",
    },
    {
      label: "Active Accounts",
      value: stats.activeCustomers,
      icon: TrendingUp,
      color: "text-lime-300",
      bg: "bg-lime-300/10",
      border: "border-lime-300/20",
    },
    {
      label: "Suspended",
      value: stats.suspendedCustomers,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
      border: "border-red-400/20",
    },
    {
      label: "Total Vehicles",
      value: stats.totalVehicles,
      icon: Car,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/20",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Dashboard</h1>
        <p className="text-sm text-zinc-400">Overview of all customer accounts and fleet activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.border} ${card.bg} p-6`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-400">{card.label}</p>
              <card.icon className={`size-5 ${card.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[.07] bg-white/[.03]">
        <div className="border-b border-white/[.07] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Customers</h2>
        </div>
        <div className="divide-y divide-white/[.07]">
          {recentWorkspaces.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-400">
              No customers yet. Create your first customer from the Customers page.
            </div>
          ) : (
            recentWorkspaces.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-400/10 text-sm font-bold text-purple-400">
                    {ws.profile_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ws.name}</p>
                    <p className="text-xs text-zinc-500">{ws.profile_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ws.status === "active"
                        ? "bg-lime-300/10 text-lime-300"
                        : ws.status === "suspended"
                          ? "bg-red-400/10 text-red-400"
                          : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {ws.status}
                  </span>
                  <p className="mt-1 text-xs text-zinc-500">
                    {ws.vehicle_count} vehicles · {formatDateTime(ws.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
