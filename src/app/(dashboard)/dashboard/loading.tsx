export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold">Today</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold">This Month</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted mb-4" />
          <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-lg border p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted mb-4" />
          <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}
