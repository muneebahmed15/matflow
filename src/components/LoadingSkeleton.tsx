export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
      <div className="h-3 bg-white/10 rounded w-1/3 mb-4" />
      <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
      <div className="h-2 bg-white/10 rounded w-1/4" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/4" />
      <div className="h-4 bg-white/10 rounded w-1/3 hidden md:block" />
      <div className="h-4 bg-white/10 rounded w-16 ml-auto" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
