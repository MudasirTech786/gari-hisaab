"use client"

import { Sidebar } from "@/components/sidebar"

interface AppHeaderProps {
  title?: string
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-[#f3f4f6]/90 px-4 backdrop-blur-xl lg:hidden">
      <Sidebar />
      {title && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}
    </header>
  )
}
