"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AppNavbar } from "@/components/app-navbar";
import { UserMenu } from "@/components/user-menu";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [profileLabel, setProfileLabel] = useState("Platform Admin");

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_platform_admin, full_name, email")
        .eq("user_id", user.id)
        .single();

      if (!profile?.is_platform_admin) {
        router.replace("/dashboard");
        return;
      }

      setProfileLabel("Platform Admin");
      setAuthorized(true);
    }

    checkAdmin();
  }, [router]);

  if (authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-foreground">
      <AdminSidebar mobileProfile={<UserMenu label={profileLabel} isAdmin />} />
      <div className="lg:pl-64">
        <AppNavbar label={profileLabel} isAdmin />
        <main className="admin-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
