import { Skeleton } from './ui/skeleton'

// Reusable skeleton compositions, one per page's data region. Each mirrors the
// real layout's shape so the page doesn't visibly jump when data arrives.

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-28" />
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

// A list of rows (transactions, income, etc.) inside a bordered card.
export function ListRowsSkeleton({ rows = 6 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// A grid of card skeletons with a progress bar (budgets, savings).
export function CardsSkeleton({ count = 6, columns = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={`grid grid-cols-1 ${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-3 w-3 rounded-full shrink-0" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="space-y-2 mb-3">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-3 w-16 mt-3" />
        </div>
      ))}
    </div>
  )
}

// A chart panel placeholder.
export function ChartSkeleton({ height = 280 }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </section>
  )
}

// Dashboard: stat cards + budget progress bars + recent transactions.
export function DashboardSkeleton() {
  return (
    <>
      <StatCardsSkeleton count={4} />
      <Skeleton className="h-24 w-full rounded-xl mb-8" />
      <section className="mb-8">
        <Skeleton className="h-5 w-40 mb-4" />
        <CardsSkeleton count={3} />
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={280} />
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 pb-3">
            <Skeleton className="h-5 w-44" />
          </div>
          <ListRowsSkeleton rows={5} />
        </section>
      </div>
    </>
  )
}

// Trends: header + stat cards + a column of chart panels.
export function TrendsSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-52 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mb-6">
        <ChartSkeleton height={280} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={300} />
        <ChartSkeleton height={300} />
      </div>
    </div>
  )
}
