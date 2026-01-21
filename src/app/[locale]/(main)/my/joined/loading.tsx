import { CardListSkeleton } from "@/components/ui/loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function JoinedTournamentsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardListSkeleton count={6} />
    </div>
  )
}
