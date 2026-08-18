"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Car,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  X,
  Save,
  Loader2,
  Mail,
  Phone,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/constants"
import {
  getCustomerDetails,
  updateCustomer,
  suspendCustomer,
  reactivateCustomer,
} from "@/app/actions/admin-customers"
import type { CustomerDetails } from "@/app/actions/admin-customers"
import { toast } from "sonner"

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [details, setDetails] = useState<CustomerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [editName, setEditName] = useState("")
  const [editFleet, setEditFleet] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")

  const fetchDetails = useCallback(async () => {
    const result = await getCustomerDetails(workspaceId)
    if (result.success && result.data) {
      setDetails(result.data)
      setEditName(result.data.profile?.full_name || "")
      setEditFleet(result.data.workspace.name)
      setEditEmail(result.data.profile?.email || "")
      setEditPhone(result.data.profile?.phone || "")
    }
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  function startEditing() {
    if (!details) return
    setEditName(details.profile?.full_name || "")
    setEditFleet(details.workspace.name)
    setEditEmail(details.profile?.email || "")
    setEditPhone(details.profile?.phone || "")
    setEditing(true)
  }

  async function saveEdits() {
    setSaving(true)
    const result = await updateCustomer(workspaceId, {
      full_name: editName,
      fleet_name: editFleet,
      email: editEmail,
      phone: editPhone || undefined,
    })
    setSaving(false)

    if (result.success) {
      toast.success("Customer updated")
      setEditing(false)
      setLoading(true)
      await fetchDetails()
    } else {
      toast.error(result.error || "Update failed")
    }
  }

  async function toggleStatus() {
    if (!details) return
    const newStatus = details.workspace.status === "active" ? "suspended" : "active"
    if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Reactivate"} this customer?`)) return

    setActionLoading(true)
    const result =
      newStatus === "suspended"
        ? await suspendCustomer(workspaceId)
        : await reactivateCustomer(workspaceId)

    if (result.success) {
      toast.success(`Customer ${newStatus === "suspended" ? "suspended" : "reactivated"}`)
      await fetchDetails()
    } else {
      toast.error(result.error || "Action failed")
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    )
  }

  if (!details) {
    return (
      <div className="space-y-4">
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="size-4" />
          Back to Customers
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-sm text-gray-500">Customer not found.</p>
        </div>
      </div>
    )
  }

  const { workspace, profile, vehicles, members } = details
  const isActive = workspace.status === "active"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {workspace.name}
            </h1>
            <p className="text-sm text-gray-500">{profile?.email || "No email"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
              <Edit3 className="size-3.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(false)}>
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600" onClick={saveEdits} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save
              </Button>
            </>
          )}
          <Button
            variant={isActive ? "destructive" : "outline"}
            size="sm"
            className={isActive ? "gap-1.5" : "gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"}
            onClick={toggleStatus}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isActive ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {isActive ? "Suspend" : "Activate"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Customer Information</h2>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fleet Name</label>
                  <Input value={editFleet} onChange={(e) => setEditFleet(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Users className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Mail className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Building2 className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fleet</p>
                    <p className="text-sm font-medium text-gray-900">{workspace.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Phone className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Calendar className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(workspace.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-xl ${isActive ? "bg-emerald-50" : "bg-red-50"}`}>
                    {isActive ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`text-sm font-medium ${isActive ? "text-emerald-700" : "text-red-600"}`}>{workspace.status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Vehicles ({vehicles.length})
            </h2>
            {vehicles.length === 0 ? (
              <p className="text-sm text-gray-400">No vehicles yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Registration</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vehicles.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 text-sm font-medium text-gray-900">{v.name}</td>
                        <td className="py-2.5 text-sm text-gray-600">{v.registration_number}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            v.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Members ({members.length})
            </h2>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">No members.</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                      {m.profile_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{m.profile_name}</p>
                      <p className="truncate text-xs text-gray-500">{m.profile_email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.role === "owner" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Vehicles</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{details.vehicle_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Members</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{details.member_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Updated</span>
                </div>
                <span className="text-sm text-gray-600">{formatDateTime(workspace.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
