"use client"

import { Layers } from "lucide-react"

export default function PlansPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Plans</h1>
        <p className="text-sm text-zinc-400">Configure pricing plans and feature tiers.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[.07] bg-white/[.03] py-20">
        <Layers className="size-12 text-zinc-600 mb-4" />
        <p className="text-lg font-medium text-zinc-400">Coming Soon</p>
        <p className="text-sm text-zinc-600 mt-1">Plan management will be available here.</p>
      </div>
    </div>
  )
}
