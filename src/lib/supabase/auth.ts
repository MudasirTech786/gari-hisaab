import type { createClient } from "./server";

export async function getAuthUser(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  return user;
}

export async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string,
  userMetadata?: Record<string, unknown>
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (profile) return profile;

  const fullName =
    (userMetadata?.full_name as string) ||
    (userMetadata?.name as string) ||
    email?.split("@")[0] ||
    "User";

  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      full_name: fullName,
      email,
      role: "owner",
      is_platform_admin: false,
    })
    .select("id")
    .single();

  if (createError || !newProfile) {
    throw new Error("Profile not found");
  }

  return newProfile;
}

export async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const user = await getAuthUser(supabase);

  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  return data?.is_platform_admin === true;
}

export async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const user = await getAuthUser(supabase);

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership) return membership.workspace_id;

  console.warn(
    "[WORKSPACE] No workspace membership found for user",
    user.id,
    "- memberError:",
    memberError?.message,
    "- attempting auto-migration"
  );

  const { data: workspace, error: wsError } = await supabase
    .rpc("migrate_owner_to_workspace", { p_owner_id: user.id });

  if (wsError || !workspace) {
    console.error(
      "[WORKSPACE] Auto-migration failed:",
      wsError?.message,
      wsError?.code
    );
    throw new Error("No workspace found. Please create a workspace first.");
  }

  return workspace as string;
}

export async function getWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const workspaceId = await getWorkspaceId(supabase);

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, owner_id, status, created_at, updated_at")
    .eq("id", workspaceId)
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkspaceRole(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const user = await getAuthUser(supabase);
  const workspaceId = await getWorkspaceId(supabase);

  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  return data?.role || "viewer";
}

export async function createWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string
) {
  const user = await getAuthUser(supabase);

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    user.id.substring(0, 8);

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name, slug, owner_id: user.id, status: "active" })
    .select("id, name, slug, owner_id, status, created_at, updated_at")
    .single();

  if (wsError) throw wsError;

  await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

  return workspace;
}
