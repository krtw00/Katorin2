import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  SeriesWithOrganizer,
  seriesStatusLabels,
  pointSystemLabels,
} from '@/types/series'

type Props = {
  series: SeriesWithOrganizer
  tournamentCount?: number
  showOrganizer?: boolean
  showManageLink?: boolean
}

const statusConfig: Record<string, { dot: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { dot: '⚪', variant: 'outline' },
  active: { dot: '🟢', variant: 'default' },
  completed: { dot: '⚫', variant: 'outline' },
  cancelled: { dot: '🔴', variant: 'destructive' },
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '期間未設定'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }
  if (startDate) return `${formatDate(startDate)} -`
  if (endDate) return `- ${formatDate(endDate)}`
  return ''
}

export function SeriesListItem({
  series,
  tournamentCount = 0,
  showOrganizer = false,
  showManageLink = false,
}: Props) {
  const config = statusConfig[series.status]
  const href = showManageLink
    ? `/series/${series.id}/edit`
    : `/series/${series.id}`

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {/* Status dot */}
      <span className="text-sm">{config.dot}</span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:underline">
            {series.name}
          </span>
          <Badge variant={config.variant} className="text-xs shrink-0">
            {seriesStatusLabels[series.status]}
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0">
            {series.entry_type === 'individual' ? '個人戦' : 'チーム戦'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{pointSystemLabels[series.point_system]}</span>
          <span>{tournamentCount}大会</span>
          <span>{formatDateRange(series.start_date, series.end_date)}</span>
          {showOrganizer && (
            <span>主催: {series.organizer.display_name}</span>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        →
      </span>
    </Link>
  )
}

// Section header for grouped lists
export function SeriesListSection({
  title,
  count,
  children,
  emptyMessage = 'シリーズがありません',
}: {
  title: string
  count: number
  children: React.ReactNode
  emptyMessage?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      {count > 0 ? (
        <div className="divide-y">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground px-3 py-4 text-center">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}
