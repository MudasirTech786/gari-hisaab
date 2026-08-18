"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react"
import { useTransition } from "react"

import { logoutAction } from "@/app/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserMenuProps {
  label: string
  isAdmin: boolean
}

export function UserMenu({ label, isAdmin }: UserMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const settingsHref = isAdmin ? "/admin/settings" : "/settings"
  const initial = label.trim().charAt(0).toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Open user menu"
            className="flex h-10 max-w-56 items-center gap-2 rounded-xl px-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        }
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime-300/25 text-xs font-semibold text-lime-950 ring-1 ring-lime-400/30">
          {initial}
        </span>
        <span className="hidden truncate sm:block">{label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white p-1.5 shadow-[0_12px_28px_rgba(24,29,26,.14)]">
        <DropdownMenuItem onClick={() => router.push(settingsHref)} className="gap-2 rounded-lg px-2.5 py-2">
          <UserRound className="size-4 text-muted-foreground" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(settingsHref)} className="gap-2 rounded-lg px-2.5 py-2">
          <Settings className="size-4 text-muted-foreground" />
          {isAdmin ? "Platform Settings" : "Settings"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => startTransition(async () => { await logoutAction() })}
          variant="destructive"
          className="gap-2 rounded-lg px-2.5 py-2"
        >
          <LogOut className="size-4" />
          {isPending ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
