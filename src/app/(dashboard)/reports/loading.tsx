export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="rounded-lg border p-6">
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="h-3 w-24 animate-pulse rounded bg-muted mb-2" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted mb-4" />
          <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-lg border p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted mb-4" />
          <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}
