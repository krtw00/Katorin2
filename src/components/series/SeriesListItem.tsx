import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  SeriesWithOrganizer,
  seriesStatusLabels,
} from '@/types/series'
import { useTranslations } from 'next-intl'

type Props = {
  series: SeriesWithOrganizer
  tournamentCount?: number
  showOrganizer?: boolean
  showManageLink?: boolean
}

const statusConfig: Record<string, { dot: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { dot: '⚪', variant: 'outline' },
  registration: { dot: '🔵', variant: 'secondary' },
  in_progress: { dot: '🟢', variant: 'default' },
  completed: { dot: '⚫', variant: 'outline' },
  cancelled: { dot: '🔴', variant: 'destructive' },
}

export function SeriesListItem({
  series,
  tournamentCount = 0,
  showOrganizer = false,
  showManageLink = false,
}: Props) {
  const t = useTranslations('series')
  const config = statusConfig[series.status] ?? statusConfig.draft
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
            {series.title}
          </span>
          <Badge variant={config.variant} className="text-xs shrink-0">
            {seriesStatusLabels[series.status]}
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0">
            {series.entry_type === 'individual' ? t('entryType.individual') : t('entryType.team')}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{tournamentCount}{t('list.tournamentUnit')}</span>
          {showOrganizer && (
            <span>{t('detail.organizer')}: {series.organizer.display_name}</span>
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
  emptyMessage,
}: {
  title: string
  count: number
  children: React.ReactNode
  emptyMessage?: string
}) {
  const t = useTranslations('series')
  const defaultEmptyMessage = emptyMessage || t('list.empty')
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
          {defaultEmptyMessage}
        </p>
      )}
    </div>
  )
}
