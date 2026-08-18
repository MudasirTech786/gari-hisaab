"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Layers,
  Activity,
  Settings,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useState, type ReactNode } from "react"

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "CUSTOMERS",
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Create Customer", href: "/admin/customers/new", icon: UserPlus },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { label: "Plans", href: "/admin/plans", icon: Layers },
      { label: "Activity", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Platform Settings", href: "/admin/settings", icon: Settings },
    ],
  },
]

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-[#0b0f0d] text-zinc-100">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-9 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10">
          <Shield className="size-5 text-purple-400" />
        </div>
        <div>
          <span className="block text-base font-semibold tracking-tight text-white">Gari Hisaab</span>
          <span className="text-[10px] font-medium tracking-[.14em] text-purple-400 uppercase">Platform Admin</span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[.14em] text-zinc-600 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-purple-400/10 text-purple-200 ring-1 ring-purple-400/10 shadow-[inset_3px_0_0_#a855f7]"
                        : "text-zinc-400 hover:bg-white/[.045] hover:text-zinc-100"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

    </div>
  )
}

export function AdminSidebar({ mobileProfile }: { mobileProfile?: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-white/[.07]">
        <AdminSidebarContent />
      </aside>

      <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-[#f3f4f6]/90 px-4 backdrop-blur-xl lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden" />}
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-72 border-r border-white/[.08] bg-[#0b0f0d] p-0">
            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
            <AdminSidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold tracking-tight text-foreground">Gari Hisaab</span>
        <div className="ml-auto">{mobileProfile}</div>
      </div>
    </>
  )
}
