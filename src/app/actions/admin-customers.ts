"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthUser, isPlatformAdmin } from "@/lib/supabase/auth"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
console.log("[ADMIN] env check:", {
  urlConfigured: !!supabaseUrl,
  secretKeyConfigured: !!supabaseSecretKey,
})
if (!supabaseUrl) {
  throw new Error("[ADMIN] NEXT_PUBLIC_SUPABASE_URL is not set in .env.local")
}
if (!supabaseSecretKey) {
  throw new Error("[ADMIN] SUPABASE_SECRET_KEY is not set in .env.local. The old SUPABASE_SERVICE_ROLE_KEY has been renamed.")
}
if (!supabaseSecretKey.startsWith("sb_secret_")) {
  console.warn(
    "[ADMIN] SUPABASE_SECRET_KEY does not start with sb_secret_.",
    "Ensure it is the secret key from Supabase Dashboard → Settings → API.",
    "Current prefix:",
    supabaseSecretKey.substring(0, 8)
  )
}
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

export interface ProvisionCustomerInput {
  email: string
  full_name: string
  fleet_name: string
  phone?: string
  initial_password: string
}

export interface ProvisionCustomerResult {
  success: boolean
  error?: string
  workspace_id?: string
  user_id?: string
}

export async function provisionCustomer(
  input: ProvisionCustomerInput
): Promise<ProvisionCustomerResult> {
  try {
    const supabase = await createSupabaseClient()
    const user = await getAuthUser(supabase)
    const admin = await isPlatformAdmin(supabase)

    if (!admin) {
      return { success: false, error: "Unauthorized: Not a platform admin" }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.initial_password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        is_platform_admin: false,
      },
    })

    if (createError || !newUser?.user) {
      return {
        success: false,
        error: createError?.message || "Failed to create auth user",
      }
    }

    const userId = newUser.user.id

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          full_name: input.full_name,
          email: input.email,
          role: "customer",
          is_platform_admin: false,
        },
        { onConflict: "user_id" }
      )

    if (profileError) {
      return { success: false, error: `Profile creation failed: ${profileError.message}` }
    }

    const slug =
      input.fleet_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      userId.substring(0, 8)

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        name: input.fleet_name,
        slug,
        owner_id: userId,
        status: "active",
      })
      .select("id")
      .single()

    if (wsError) {
      return { success: false, error: `Workspace creation failed: ${wsError.message}` }
    }

    const { error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: "owner",
      })

    if (memberError) {
      return { success: false, error: `Membership creation failed: ${memberError.message}` }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      workspace_id: workspace.id,
      action: "customer_provisioned",
      entity_type: "workspace",
      entity_id: workspace.id,
      details: {
        customer_email: input.email,
        customer_name: input.full_name,
        fleet_name: input.fleet_name,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/admin/customers")

    return {
      success: true,
      workspace_id: workspace.id,
      user_id: userId,
    }
  } catch (error) {
    console.error("[PROVISION_CUSTOMER]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }
  }
}

export interface CustomerRow {
  id: string
  name: string
  slug: string
  owner_id: string
  status: string
  created_at: string
  updated_at: string
  profile_email: string
  profile_name: string
  vehicle_count: number
  member_count: number
}

export async function listCustomers(statusFilter?: string): Promise<{
  success: boolean
  data?: CustomerRow[]
  error?: string
}> {
  try {
    const supabase = await createSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let authUser = user

    if (authError || !authUser) {
      const { data: { session } } = await supabase.auth.getSession()
      authUser = session?.user ?? null
    }

    if (!authUser) {
      return {
        success: false,
        error: "Authentication failed: " + (authError?.message || "no user in session"),
      }
    }

    const { data: adminProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_platform_admin")
      .eq("user_id", authUser.id)
      .maybeSingle()

    if (profileErr) {
      const isPermissionDenied = profileErr.code === "42501"
      return {
        success: false,
        error: isPermissionDenied
          ? "Service-role key cannot query the database. Ensure SUPABASE_SECRET_KEY in .env.local contains the sb_secret_ key from Supabase Dashboard → Settings → API."
          : "Profile lookup failed: " + profileErr.message,
      }
    }

    if (!adminProfile) {
      return {
        success: false,
        error: "No profile found for user ID " + authUser.id,
      }
    }

    if (adminProfile.is_platform_admin !== true) {
      return {
        success: false,
        error: "Account is not a Platform Admin",
      }
    }

    let query = supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, owner_id, status, created_at, updated_at")

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data: workspaces, error: wsError } = await query

    if (wsError) {
      return { success: false, error: wsError.message }
    }
    if (!workspaces || workspaces.length === 0) return { success: true, data: [] }

    const enriched: CustomerRow[] = []

    for (const ws of workspaces) {
      try {
        const { data: ownerMembership } = await supabaseAdmin
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", ws.id)
          .eq("role", "owner")
          .single()

        let profile = null
        if (ownerMembership) {
          const { data: p } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name, is_platform_admin")
            .eq("user_id", ownerMembership.user_id)
            .single()

          if (p && !p.is_platform_admin) {
            profile = p
          } else if (p && p.is_platform_admin) {
            continue
          }
        }

        if (!profile && !ownerMembership) {
          const { data: p } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name, is_platform_admin")
            .eq("user_id", ws.owner_id)
            .single()

          if (p && !p.is_platform_admin) {
            profile = p
          } else {
            continue
          }
        }

        const { count: vehicleCount } = await supabaseAdmin
          .from("cars")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id)

        const { count: memberCount } = await supabaseAdmin
          .from("workspace_members")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id)

        enriched.push({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          owner_id: ws.owner_id,
          status: ws.status,
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          profile_email: profile?.email || "—",
          profile_name: profile?.full_name || "—",
          vehicle_count: vehicleCount || 0,
          member_count: memberCount || 0,
        })
      } catch {
        continue
      }
    }

    return { success: true, data: enriched }
  } catch (error) {
    console.error("[LIST_CUSTOMERS]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }
  }
}

export interface CustomerDetails {
  workspace: {
    id: string
    name: string
    slug: string
    owner_id: string
    status: string
    created_at: string
    updated_at: string
  }
  profile: {
    user_id: string
    full_name: string
    email: string
    phone: string | null
    role: string
  } | null
  vehicles: {
    id: string
    name: string
    registration_number: string
    status: string
  }[]
  members: {
    id: string
    user_id: string
    role: string
    joined_at: string
    profile_name: string
    profile_email: string
  }[]
  vehicle_count: number
  member_count: number
}

export async function getCustomerDetails(workspaceId: string): Promise<{
  success: boolean
  data?: CustomerDetails
  error?: string
}> {
  try {
    const supabase = await createSupabaseClient()
    const admin = await isPlatformAdmin(supabase)
    if (!admin) return { success: false, error: "Unauthorized" }

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, owner_id, status, created_at, updated_at")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return { success: false, error: wsError?.message || "Workspace not found" }
    }

    const { data: ownerMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("role", "owner")
      .single()

    let profile = null
    if (ownerMembership) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, email, phone, role")
        .eq("user_id", ownerMembership.user_id)
        .single()
      profile = p
    }

    const { data: vehicles } = await supabaseAdmin
      .from("cars")
      .select("id, name, registration_number, status")
      .eq("workspace_id", workspaceId)

    const { data: membersRaw } = await supabaseAdmin
      .from("workspace_members")
      .select("id, user_id, role, created_at")
      .eq("workspace_id", workspaceId)

    const members: CustomerDetails["members"] = []
    if (membersRaw) {
      for (const m of membersRaw) {
        const { data: mp } = await supabaseAdmin
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", m.user_id)
          .single()

        members.push({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.created_at,
          profile_name: mp?.full_name || "—",
          profile_email: mp?.email || "—",
        })
      }
    }

    return {
      success: true,
      data: {
        workspace,
        profile,
        vehicles: vehicles || [],
        members,
        vehicle_count: vehicles?.length || 0,
        member_count: members.length,
      },
    }
  } catch (error) {
    console.error("[GET_CUSTOMER_DETAILS]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }
  }
}

export interface UpdateCustomerInput {
  full_name?: string
  email?: string
  fleet_name?: string
  phone?: string
}

export async function updateCustomer(
  workspaceId: string,
  input: UpdateCustomerInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient()
    const admin = await isPlatformAdmin(supabase)
    if (!admin) return { success: false, error: "Unauthorized" }

    const { data: ownerMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("role", "owner")
      .single()

    if (input.full_name || input.email || input.phone) {
      const profileUpdates: Record<string, unknown> = {}
      if (input.full_name) profileUpdates.full_name = input.full_name
      if (input.email) profileUpdates.email = input.email
      if (input.phone !== undefined) profileUpdates.phone = input.phone

      const targetUserId = ownerMembership?.user_id
      if (targetUserId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", targetUserId)

        if (error) return { success: false, error: `Profile update failed: ${error.message}` }
      }
    }

    if (input.fleet_name) {
      const { error } = await supabaseAdmin
        .from("workspaces")
        .update({ name: input.fleet_name })
        .eq("id", workspaceId)

      if (error) return { success: false, error: `Workspace update failed: ${error.message}` }
    }

    await supabaseAdmin.from("audit_logs").insert({
      action: "customer_updated",
      entity_type: "workspace",
      entity_id: workspaceId,
      details: input,
    })

    revalidatePath("/admin")
    revalidatePath("/admin/customers")
    revalidatePath(`/admin/customers/${workspaceId}`)

    return { success: true }
  } catch (error) {
    console.error("[UPDATE_CUSTOMER]", error)
    return { success: false, error: error instanceof Error ? error.message : "Internal error" }
  }
}

export async function suspendCustomer(workspaceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient()
    const admin = await isPlatformAdmin(supabase)
    if (!admin) return { success: false, error: "Unauthorized" }

    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ status: "suspended" })
      .eq("id", workspaceId)

    if (error) return { success: false, error: error.message }

    await supabaseAdmin.from("audit_logs").insert({
      action: "customer_suspended",
      entity_type: "workspace",
      entity_id: workspaceId,
    })

    revalidatePath("/admin")
    revalidatePath("/admin/customers")
    revalidatePath(`/admin/customers/${workspaceId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Internal error" }
  }
}

export async function reactivateCustomer(workspaceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient()
    const admin = await isPlatformAdmin(supabase)
    if (!admin) return { success: false, error: "Unauthorized" }

    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ status: "active" })
      .eq("id", workspaceId)

    if (error) return { success: false, error: error.message }

    await supabaseAdmin.from("audit_logs").insert({
      action: "customer_reactivated",
      entity_type: "workspace",
      entity_id: workspaceId,
    })

    revalidatePath("/admin")
    revalidatePath("/admin/customers")
    revalidatePath(`/admin/customers/${workspaceId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Internal error" }
  }
}
