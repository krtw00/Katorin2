export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  SeriesWithOrganizer,
  seriesStatusLabels,
} from '@/types/series'
import { TournamentWithOrganizer } from '@/types/tournament'
import { TournamentListItem } from '@/components/tournament/TournamentListItem'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SeriesDetailPage({ params }: Props) {
  const t = await getTranslations('series')
  const { id } = await params
  const supabase = await createClient()

  // Fetch series with organizer
  const { data: series, error } = await supabase
    .from('series')
    .select(
      `
      *,
      organizer:profiles!series_organizer_id_fkey(*)
    `
    )
    .eq('id', id)
    .single() as { data: SeriesWithOrganizer | null; error: unknown }

  if (error || !series) {
    notFound()
  }

  // Fetch tournaments in this series
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `
    )
    .eq('series_id', id)
    .order('start_at', { ascending: false }) as { data: TournamentWithOrganizer[] | null }

  // Fetch participant counts for tournaments
  const tournamentIds = tournaments?.map((t) => t.id) || []
  const { data: participantCounts } = await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', tournamentIds) as { data: { tournament_id: string }[] | null }

  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOrganizer = user?.id === series.organizer_id

  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
    draft: { variant: 'outline' },
    registration: { variant: 'secondary' },
    in_progress: { variant: 'default' },
    completed: { variant: 'outline' },
    cancelled: { variant: 'outline' },
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{series.title}</h1>
            <Badge variant={statusConfig[series.status]?.variant ?? 'outline'}>
              {seriesStatusLabels[series.status]}
            </Badge>
            <Badge variant="outline">
              {series.entry_type === 'individual' ? t('entryType.individual') : t('entryType.team')}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {t('detail.organizer')}: {series.organizer.display_name}
          </p>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <Link href={`/series/${id}/edit`}>
              <Button variant="outline">{t('detail.edit')}</Button>
            </Link>
            <Link href={`/tournaments/new?series_id=${id}`}>
              <Button>{t('detail.addTournament')}</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{tournaments?.length || 0}</div>
            <div className="text-sm text-muted-foreground">{t('detail.tournamentCount')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{seriesStatusLabels[series.status]}</div>
            <div className="text-sm text-muted-foreground">{t('detail.status')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{t('detail.overview')}</TabsTrigger>
          <TabsTrigger value="tournaments">{t('detail.tournaments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('detail.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {series.description || t('detail.noDescription')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardContent className="p-2">
              {tournaments && tournaments.length > 0 ? (
                <div className="divide-y">
                  {tournaments.map((tournament) => (
                    <TournamentListItem
                      key={tournament.id}
                      tournament={tournament}
                      participantCount={countMap.get(tournament.id) || 0}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('detail.noTournaments')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
