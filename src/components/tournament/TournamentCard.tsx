import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TournamentWithOrganizer,
  tournamentStatusLabels,
  tournamentFormatLabels,
  matchFormatLabels,
} from '@/types/tournament'

type Props = {
  tournament: TournamentWithOrganizer
  participantCount?: number
}

export function TournamentCard({ tournament, participantCount = 0 }: Props) {
  const statusVariants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    draft: 'outline',
    published: 'secondary',
    recruiting: 'default',
    in_progress: 'secondary',
    completed: 'outline',
    cancelled: 'destructive',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{tournament.title}</CardTitle>
          <Badge variant={statusVariants[tournament.status]}>
            {tournamentStatusLabels[tournament.status]}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {tournament.description || '説明なし'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">形式</span>
          <span>{tournamentFormatLabels[tournament.tournament_format]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">対戦</span>
          <span>{matchFormatLabels[tournament.match_format]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">参加者</span>
          <span>
            {participantCount} / {tournament.max_participants}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">主催</span>
          <span>{tournament.organizer.display_name}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/tournaments/${tournament.id}`} className="w-full">
          <Button className="w-full">
            {tournament.status === 'recruiting' ? 'エントリーする' : '詳細を見る'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
