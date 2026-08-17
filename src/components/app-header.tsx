"use client"

import { Sidebar } from "@/components/sidebar"

interface AppHeaderProps {
  title?: string
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
      <Sidebar />
      {title && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}
    </header>
  )
}
