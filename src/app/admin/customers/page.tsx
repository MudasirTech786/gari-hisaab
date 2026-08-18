"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Users,
  Plus,
  Search,
  Car,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/constants"
import { listCustomers, suspendCustomer, reactivateCustomer } from "@/app/actions/admin-customers"
import type { CustomerRow } from "@/app/actions/admin-customers"
import { toast } from "sonner"

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Inactive", value: "inactive" },
] as const

const PAGE_SIZE = 10

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchCustomers = useCallback(async (filter?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listCustomers(filter)
      if (result.success && result.data) {
        setCustomers(result.data)
      } else if (!result.success) {
        setError(result.error || "Failed to load customers")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCustomers(statusFilter)
  }, [statusFilter, fetchCustomers])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.profile_name.toLowerCase().includes(q) ||
        c.profile_email.toLowerCase().includes(q)
    )
  }, [search, customers])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  async function toggleStatus(ws: CustomerRow) {
    const newStatus = ws.status === "active" ? "suspended" : "active"
    if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Reactivate"} "${ws.name}"?`)) return

    setActionLoading(ws.id)

    const result = newStatus === "suspended"
      ? await suspendCustomer(ws.id)
      : await reactivateCustomer(ws.id)

    if (result.success) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === ws.id ? { ...c, status: newStatus } : c))
      )
      toast.success(`Customer ${newStatus === "suspended" ? "suspended" : "reactivated"}`)
    } else {
      toast.error(result.error || "Action failed")
    }
    setActionLoading(null)
  }

  const counts = useMemo(() => {
    const all = customers.length
    const active = customers.filter((c) => c.status === "active").length
    const suspended = customers.filter((c) => c.status === "suspended").length
    const inactive = customers.filter((c) => c.status === "inactive").length
    return { all, active, suspended, inactive }
  }, [customers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage all customer accounts and workspaces.</p>
        </div>
        <Link href="/admin/customers/new">
          <Button className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
            <Plus className="size-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, email, or fleet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className="ml-1 text-gray-400">
                {tab.value === "all" ? counts.all : counts[tab.value as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto size-10 text-red-400" />
          <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchCustomers(statusFilter)}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center">
          <Users className="mx-auto size-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {search ? "No customers match your search." : "No customers yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vehicles</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((customer) => (
                    <tr key={customer.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600">
                            {customer.profile_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/admin/customers/${customer.id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-600 transition-colors">
                              {customer.name}
                            </Link>
                            <p className="text-xs text-gray-500">{customer.profile_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.profile_email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Car className="size-3.5 text-gray-400" />
                          {customer.vehicle_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{customer.member_count}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            customer.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : customer.status === "suspended"
                                ? "bg-red-50 text-red-600"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {customer.status === "active" && <CheckCircle2 className="size-3" />}
                          {customer.status === "suspended" && <AlertTriangle className="size-3" />}
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{formatDateTime(customer.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-900">
                              <Eye className="size-3.5" />
                              <span>View</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={actionLoading === customer.id}
                            onClick={() => toggleStatus(customer)}
                          >
                            {customer.status === "active" ? (
                              <>
                                <XCircle className="size-3.5 text-red-400" />
                                <span className="text-red-500">Suspend</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                                <span className="text-emerald-600">Activate</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
