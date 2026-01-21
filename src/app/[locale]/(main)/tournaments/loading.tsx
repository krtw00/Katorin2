import { CardListSkeleton } from "@/components/ui/loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function TournamentsLoading() {
  return (
    <div className="container py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* フィルター */}
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* カードリスト */}
      <CardListSkeleton count={6} />
    </div>
  )
}
