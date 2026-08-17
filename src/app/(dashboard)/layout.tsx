import { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-theme min-h-screen bg-background text-foreground dark">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="dashboard-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
