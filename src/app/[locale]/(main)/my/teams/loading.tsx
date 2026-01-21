import { CardListSkeleton } from "@/components/ui/loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function MyTeamsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <CardListSkeleton count={4} />
    </div>
  )
}
