import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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
import Link from 'next/link'
import {
  tournamentStatusLabels,
  MatchWithPlayers,
  ParticipantWithUser,
} from '@/types/tournament'
import { TournamentTabs } from '@/components/tournament/TournamentTabs'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('tournament.detail')
  const supabase = await createClient()

  // Fetch tournament with organizer and series
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*),
      series:series(*)
    `)
    .eq('id', id)
    .single()

  if (error || !tournament) {
    notFound()
  }

  // Fetch organizer's team (if exists)
  const { data: organizerTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('leader_id', tournament.organizer_id)
    .maybeSingle()

  // Fetch participants with user details
  const { data: participants } = await supabase
    .from('participants')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('tournament_id', id)
    .order('seed', { ascending: true })

  // Fetch matches with player details
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:profiles!matches_player1_id_fkey(*),
      player2:profiles!matches_player2_id_fkey(*),
      winner:profiles!matches_winner_id_fkey(*)
    `)
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user has already entered
  const hasEntered = participants?.some((p) => p.user_id === user?.id)

  // Check if user is the organizer
  const isOrganizer = user?.id === tournament.organizer_id

  const statusVariants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    draft: 'outline',
    published: 'outline',
    recruiting: 'default',
    in_progress: 'secondary',
    completed: 'secondary',
    cancelled: 'destructive',
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {tournament.series && (
                <div className="mb-2">
                  <Link
                    href={`/series/${tournament.series.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    🏆 {tournament.series.name}
                  </Link>
                </div>
              )}
              <CardTitle className="text-2xl">{tournament.title}</CardTitle>
              <CardDescription className="mt-1">
                {t('participants', { current: participants?.length || 0, max: tournament.max_participants })}
              </CardDescription>
              {tournament.series && (
                <div className="mt-2">
                  <Link
                    href={`/series/${tournament.series.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('series', { name: tournament.series.name })}
                  </Link>
                </div>
              )}
              {organizerTeam && (
                <div className="mt-1">
                  <Link
                    href={`/teams/${organizerTeam.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('organizerTeam', { name: organizerTeam.name })}
                  </Link>
                </div>
              )}
            </div>
            <Badge variant={statusVariants[tournament.status]} className="shrink-0">
              {tournamentStatusLabels[tournament.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TournamentTabs
            tournament={tournament}
            participants={(participants as ParticipantWithUser[]) || []}
            matches={(matches as MatchWithPlayers[]) || []}
            isOrganizer={isOrganizer}
          />
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap border-t pt-6">
          {tournament.status === 'recruiting' && user && !hasEntered && (
            <Link href={`/tournaments/${tournament.id}/entry`}>
              <Button>{t('entry')}</Button>
            </Link>
          )}
          {tournament.status === 'recruiting' && hasEntered && (
            <Button disabled>{t('alreadyEntered')}</Button>
          )}
          {tournament.status === 'recruiting' && !user && (
            <Link href="/login">
              <Button variant="outline">{t('loginToEntry')}</Button>
            </Link>
          )}
          <Link href={`/tournaments/${tournament.id}/participants`}>
            <Button variant="outline">{t('viewParticipants')}</Button>
          </Link>
          {isOrganizer && (
            <Link href={`/tournaments/${tournament.id}/manage`}>
              <Button variant="outline">{t('manage')}</Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
