import { TableSkeleton } from "@/components/ui/loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function StandingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <TableSkeleton rows={6} />
      </div>
    </div>
  )
}
