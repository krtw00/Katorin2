import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/loading"

export default function ManageLoading() {
  return (
    <div className="container py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      {/* 参加者テーブル */}
      <TableSkeleton rows={8} />
    </div>
  )
}
