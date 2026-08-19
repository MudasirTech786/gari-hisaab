"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Car,
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wrench,
  FileText,
  Briefcase,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/contexts/workspace-context"
import { useState, type ReactNode } from "react"
import Image from "next/image"

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "FLEET",
    items: [
      { label: "Vehicles", href: "/car", icon: Car },
      { label: "Drivers", href: "/drivers", icon: Users },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Daily Records", href: "/daily-records", icon: Calendar },
      { label: "Earnings", href: "/earnings", icon: TrendingUp },
      { label: "Expenses", href: "/expenses", icon: TrendingDown },
    ],
  },
  {
    label: "VEHICLES",
    items: [
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Workspace", href: "/settings", icon: Briefcase },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { workspace } = useWorkspace()

  return (
    <div className="flex h-full flex-col bg-[#070b09] text-zinc-100">
      {/* Logo */}
      <div className="flex justify-center px-5 pt-7 pb-2">
        <div className="sb-logo relative">
          <Image
            src="/images/logo.png"
            alt="Gari Hisaab"
            width={280}
            height={280}
            className="sb-logo-img h-auto w-auto max-h-40 object-contain"
            priority
          />
        </div>
      </div>

      {/* Workspace */}
      {workspace && (
        <div className="mx-3 mb-5 mt-2 rounded-[14px] border border-white/[.08] bg-[#111614] px-3.5 py-3">
          <p className="text-[10px] font-semibold tracking-[.14em] text-zinc-500 uppercase">Workspace</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm font-medium text-white truncate">{workspace.name}&apos;s Fleet</p>
            <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[.14em] text-zinc-600 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-[180ms] ease-out",
                      isActive
                        ? "bg-gradient-to-r from-[rgba(94,233,181,0.18)] to-[rgba(94,233,181,0.08)] text-[#5ee9b5] shadow-[inset_3px_0_0_#5ee9b5,0_0_20px_rgba(94,233,181,0.08)]"
                        : "text-zinc-400 hover:bg-[rgba(94,233,181,0.05)] hover:text-zinc-200"
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

export function Sidebar({ mobileProfile }: { mobileProfile?: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-white/[.07]">
        <SidebarContent />
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
          <SheetContent side="left" showCloseButton={false} className="w-72 border-r border-white/[.08] bg-[#070b09] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold tracking-tight text-foreground">Gari Hisaab</span>
        <div className="ml-auto">{mobileProfile}</div>
      </div>
    </>
  )
}
