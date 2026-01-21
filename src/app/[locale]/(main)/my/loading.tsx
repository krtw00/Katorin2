import { Skeleton } from "@/components/ui/skeleton"
import { CardListSkeleton } from "@/components/ui/loading"

export default function MyPageLoading() {
  return (
    <div className="container py-6 space-y-6">
      {/* プロフィールヘッダー */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {/* 統計 */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      {/* 最近の大会 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <CardListSkeleton count={3} />
      </div>
    </div>
  )
}
