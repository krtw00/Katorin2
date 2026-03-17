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
} from '@/types/round'
import { useTranslations } from 'next-intl'

type Props = {
  tournament: TournamentWithOrganizer
  participantCount?: number
}

export function TournamentCard({ tournament, participantCount = 0 }: Props) {
  const t = useTranslations()
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
            {t('labels.tournamentStatus.' + tournament.status)}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {tournament.description || t('leagues.detail.noDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('tournament.detail.format')}</span>
          <span>{t('labels.tournamentFormat.' + tournament.format)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('tournament.detail.matchFormat')}</span>
          <span>{t('labels.matchFormat.' + tournament.match_format)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('tournament.detail.participantsLabel')}</span>
          <span>
            {participantCount} / {tournament.max_participants}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('tournament.detail.organizer')}</span>
          <span>{tournament.organizer.display_name}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/tournaments/${tournament.id}`} className="w-full">
          <Button className="w-full">
            {tournament.status === 'recruiting' ? t('tournament.detail.entry') : t('common.viewDetails')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
