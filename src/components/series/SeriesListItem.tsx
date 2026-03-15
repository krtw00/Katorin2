import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Trophy, User, ChevronRight } from 'lucide-react'
import { SeriesWithOrganizer } from '@/types/series'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { MetaItem } from '@/components/common/MetaItem'
import { BannerImage } from '@/components/common/BannerImage'
import { useTranslations } from 'next-intl'

type Props = {
  series: SeriesWithOrganizer
  tournamentCount?: number
  showOrganizer?: boolean
  showManageLink?: boolean
}

export function SeriesListItem({
  series,
  tournamentCount = 0,
  showOrganizer = false,
  showManageLink = false,
}: Props) {
  const t = useTranslations('series')
  const href = showManageLink
    ? `/series/${series.id}/edit`
    : `/series/${series.id}`

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <BannerImage
        src={series.cover_image_url}
        alt={series.title}
        id={series.id}
        variant="thumbnail"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:underline">
            {series.title}
          </span>
          <StatusIndicator status={series.status} showDot showIcon={false} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <MetaItem icon={Trophy}>{tournamentCount}{t('list.tournamentUnit')}</MetaItem>
          {showOrganizer && (
            <MetaItem icon={User}>{series.organizer.display_name}</MetaItem>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {series.entry_type === 'individual' ? t('entryType.individual') : t('entryType.team')}
          </Badge>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  )
}

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
