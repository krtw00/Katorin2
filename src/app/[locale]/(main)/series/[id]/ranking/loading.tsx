import { TableSkeleton } from "@/components/ui/loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function SeriesRankingLoading() {
  return (
    <div className="container py-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <TableSkeleton rows={10} />
    </div>
  )
}
