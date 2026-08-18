"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { AppNavbar } from "@/components/app-navbar";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceProvider, useWorkspace } from "@/lib/contexts/workspace-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function WorkspaceGuard({ children }: { children: ReactNode }) {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profileLabel, setProfileLabel] = useState("Account");

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_platform_admin, full_name, email")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(profile?.is_platform_admin === true);
      setProfileLabel(profile?.full_name || profile?.email || user.email || "Account");
    }

    checkRole();
  }, []);

  useEffect(() => {
    if (isAdmin === null) return;
    if (workspaceLoading) return;

    if (isAdmin) {
      router.replace("/admin");
      return;
    }

    if (!workspace && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [isAdmin, workspaceLoading, workspace, pathname, router]);

  if (isAdmin === null || workspaceLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-lime-300 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return null;
  }

  if (!workspace && pathname !== "/onboarding") {
    return null;
  }

  return (
    <div className="dashboard-theme min-h-screen bg-background text-foreground">
      <Sidebar mobileProfile={<UserMenu label={profileLabel} isAdmin={false} />} />
      <div className="lg:pl-64">
        <AppNavbar label={profileLabel} isAdmin={false} />
        <main className="dashboard-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceGuard>{children}</WorkspaceGuard>
    </WorkspaceProvider>
  );
}
