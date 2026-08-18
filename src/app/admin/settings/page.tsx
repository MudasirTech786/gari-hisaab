"use client"

import { Settings } from "lucide-react"

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Settings</h1>
        <p className="text-sm text-zinc-400">Configure global platform settings and preferences.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[.07] bg-white/[.03] py-20">
        <Settings className="size-12 text-zinc-600 mb-4" />
        <p className="text-lg font-medium text-zinc-400">Coming Soon</p>
        <p className="text-sm text-zinc-600 mt-1">Platform settings will be available here.</p>
      </div>
    </div>
  )
}
