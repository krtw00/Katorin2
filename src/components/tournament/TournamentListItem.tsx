import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  TournamentWithOrganizer,
  tournamentStatusLabels,
  tournamentFormatLabels,
} from '@/types/tournament'

type Props = {
  tournament: TournamentWithOrganizer
  participantCount?: number
  showOrganizer?: boolean
  showManageLink?: boolean
}

const statusConfig: Record<string, { dot: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { dot: '⚪', variant: 'outline' },
  published: { dot: '🟡', variant: 'secondary' },
  recruiting: { dot: '🟢', variant: 'default' },
  in_progress: { dot: '🔵', variant: 'secondary' },
  completed: { dot: '⚫', variant: 'outline' },
  cancelled: { dot: '🔴', variant: 'destructive' },
}

export function TournamentListItem({
  tournament,
  participantCount = 0,
  showOrganizer = false,
  showManageLink = false,
}: Props) {
  const config = statusConfig[tournament.status]
  const href = showManageLink
    ? `/tournaments/${tournament.id}/manage`
    : `/tournaments/${tournament.id}`

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
            {tournament.title}
          </span>
          <Badge variant={config.variant} className="text-xs shrink-0">
            {tournamentStatusLabels[tournament.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{tournamentFormatLabels[tournament.tournament_format]}</span>
          <span>
            {participantCount}/{tournament.max_participants}名
          </span>
          {showOrganizer && (
            <span>主催: {tournament.organizer.display_name}</span>
          )}
          {tournament.status === 'in_progress' && tournament.current_round && (
            <span className="text-primary">R{tournament.current_round}進行中</span>
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
