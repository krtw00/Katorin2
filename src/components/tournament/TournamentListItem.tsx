import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Users, LayoutGrid, User, ChevronRight } from 'lucide-react'
import {
  TournamentWithOrganizer,
  tournamentFormatLabels,
} from '@/types/tournament'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { MetaItem } from '@/components/common/MetaItem'
import { BannerImage } from '@/components/common/BannerImage'

type Props = {
  tournament: TournamentWithOrganizer
  participantCount?: number
  showOrganizer?: boolean
  showManageLink?: boolean
  placement?: number | null
}

const placementLabel = (placement: number) => {
  if (placement === 1) return '🥇 優勝'
  if (placement === 2) return '🥈 準優勝'
  if (placement === 3) return '🥉 3位'
  return `${placement}位`
}

export function TournamentListItem({
  tournament,
  participantCount = 0,
  showOrganizer = false,
  showManageLink = false,
  placement,
}: Props) {
  const href = showManageLink
    ? `/tournaments/${tournament.id}/manage`
    : `/tournaments/${tournament.id}`

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <BannerImage
        src={tournament.cover_image_url}
        alt={tournament.title}
        id={tournament.id}
        variant="thumbnail"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:underline">
            {tournament.title}
          </span>
          <StatusIndicator status={tournament.status} showDot showIcon={false} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <MetaItem icon={LayoutGrid}>{tournamentFormatLabels[tournament.tournament_format]}</MetaItem>
          <MetaItem icon={Users}>
            {participantCount}/{tournament.max_participants}
          </MetaItem>
          {showOrganizer && (
            <MetaItem icon={User}>{tournament.organizer.display_name}</MetaItem>
          )}
          {placement && (
            <span className="text-xs text-primary font-medium">{placementLabel(placement)}</span>
          )}
          {tournament.status === 'in_progress' && tournament.current_round && (
            <span className="text-xs text-primary">R{tournament.current_round}</span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  )
}

export function TournamentListSection({
  title,
  count,
  children,
  emptyMessage = '大会がありません',
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
