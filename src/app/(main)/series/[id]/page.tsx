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
  pointSystemLabels,
} from '@/types/series'
import { TournamentWithOrganizer } from '@/types/tournament'
import { TournamentListItem } from '@/components/tournament/TournamentListItem'
import { SeriesRankingTable } from '@/components/series/SeriesRankingTable'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SeriesDetailPage({ params }: Props) {
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
    .single() as { data: SeriesWithOrganizer | null; error: any }

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

  // Fetch rankings
  const { data: rankings } = await supabase
    .from('series_rankings')
    .select('*')
    .eq('series_id', id)
    .order('rank', { ascending: true })
    .limit(10)

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOrganizer = user?.id === series.organizer_id

  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
    draft: { variant: 'outline' },
    active: { variant: 'default' },
    completed: { variant: 'outline' },
    cancelled: { variant: 'outline' },
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{series.name}</h1>
            <Badge variant={statusConfig[series.status].variant}>
              {seriesStatusLabels[series.status]}
            </Badge>
            <Badge variant="outline">
              {series.entry_type === 'individual' ? '個人戦' : 'チーム戦'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            主催: {series.organizer.display_name}
          </p>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <Link href={`/series/${id}/edit`}>
              <Button variant="outline">編集</Button>
            </Link>
            <Link href={`/tournaments/new?series_id=${id}`}>
              <Button>大会を追加</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{tournaments?.length || 0}</div>
            <div className="text-sm text-muted-foreground">大会数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{rankings?.length || 0}</div>
            <div className="text-sm text-muted-foreground">参加者数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium">
              {series.start_date
                ? new Date(series.start_date).toLocaleDateString('ja-JP')
                : '未設定'}
            </div>
            <div className="text-sm text-muted-foreground">開始日</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium">
              {series.end_date
                ? new Date(series.end_date).toLocaleDateString('ja-JP')
                : '未設定'}
            </div>
            <div className="text-sm text-muted-foreground">終了日</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="tournaments">大会一覧</TabsTrigger>
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">説明</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {series.description || '説明なし'}
                </p>
              </CardContent>
            </Card>

            {/* Point System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ポイントシステム</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">
                  {pointSystemLabels[series.point_system]}
                </p>
                {series.point_system === 'ranking' ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(series.point_config as Record<string, number>).map(
                      ([rank, points]) => (
                        <div key={rank} className="flex justify-between">
                          <span>{rank}位</span>
                          <span className="font-medium">{points}pt</span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm">
                    1勝につき {(series.point_config as { points_per_win: number }).points_per_win}pt
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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
                  まだ大会がありません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardContent className="p-4">
              <SeriesRankingTable
                rankings={rankings || []}
                pointSystem={series.point_system}
              />
              {rankings && rankings.length > 0 && (
                <div className="mt-4 text-center">
                  <Link href={`/series/${id}/ranking`}>
                    <Button variant="outline">すべて見る</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
