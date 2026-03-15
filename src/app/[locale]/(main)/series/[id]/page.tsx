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
import { TeamApplicationForm } from '@/components/series/TeamApplicationForm'
import { ApplicationManage } from '@/components/series/ApplicationManage'
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

  // Fetch tournaments in this series (round_number順)
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `
    )
    .eq('series_id', id)
    .order('round_number', { ascending: true })
    .order('start_at', { ascending: true }) as { data: TournamentWithOrganizer[] | null }

  // Fetch block standings across all tournaments in this series
  const tournamentIds = tournaments?.map((t) => t.id) || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allStandings: any[] = []
  if (tournamentIds.length > 0) {
    const { data: standings } = await supabase
      .from('block_standings')
      .select('*')
      .in('tournament_id', tournamentIds)
    allStandings = standings || []
  }

  // Aggregate standings by team across all weeks
  const teamAgg = new Map<string, { team_name: string; team_avatar_url: string | null; block_id: string; wins: number; losses: number; total_win_points: number; round_diff: number; match_diff: number; total_rounds_won: number; matches_played: number }>()
  for (const s of allStandings) {
    const key = s.team_id as string
    const prev = teamAgg.get(key)
    if (prev) {
      prev.wins += s.wins ?? 0
      prev.losses += s.losses ?? 0
      prev.total_win_points += s.total_win_points ?? 0
      prev.round_diff += s.round_diff ?? 0
      prev.match_diff += s.match_diff ?? 0
      prev.total_rounds_won += s.total_rounds_won ?? 0
      prev.matches_played += s.matches_played ?? 0
    } else {
      teamAgg.set(key, {
        team_name: s.team_name,
        team_avatar_url: s.team_avatar_url,
        block_id: s.block_id,
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        total_win_points: s.total_win_points ?? 0,
        round_diff: s.round_diff ?? 0,
        match_diff: s.match_diff ?? 0,
        total_rounds_won: s.total_rounds_won ?? 0,
        matches_played: s.matches_played ?? 0,
      })
    }
  }

  // Get blocks for this series
  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*')
    .eq('series_id', id)
    .order('block_order', { ascending: true })

  // Fetch participant counts for tournaments
  const tIds = tournaments?.map((t) => t.id) || []
  const { data: participantCounts } = await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', tIds) as { data: { tournament_id: string }[] | null }

  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOrganizer = user?.id === series.organizer_id

  // 参加チーム一覧（シリーズに紐づくチーム）
  const { data: seriesTeams } = await supabase
    .from('teams')
    .select('id, name, leader_id, avatar_url')
    .eq('series_id', id)

  // エントリー申請（主催者 or リーダーのみRLSで見える）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let applications: any[] = []
  if (isOrganizer || user) {
    const { data: apps } = await supabase
      .from('team_applications')
      .select('*, team:teams(id, name, leader_id, leader:profiles!teams_leader_id_fkey(display_name))')
      .eq('series_id', id)
      .order('applied_at', { ascending: false })

    // メンバー数を取得
    if (apps?.length) {
      const teamIds = apps.map(a => a.team_id)
      const { data: memberCounts } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds)

      const countMap = new Map<string, number>()
      memberCounts?.forEach(m => {
        countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1)
      })

      applications = apps.map(a => {
        const team = a.team as { id: string; name: string; leader_id: string; leader: { display_name: string } | { display_name: string }[] | null } | null
        const leader = team?.leader
        const leaderName = leader ? (Array.isArray(leader) ? leader[0]?.display_name : leader.display_name) : ''
        return {
          id: a.id,
          team_id: a.team_id,
          team_name: team?.name || '',
          leader_name: leaderName,
          member_count: countMap.get(a.team_id) || 0,
          status: a.status,
          message: a.message,
          applied_at: a.applied_at,
        }
      })
    }
  }

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
      <Tabs defaultValue="standings">
        <TabsList className="mb-4">
          <TabsTrigger value="standings">順位表</TabsTrigger>
          <TabsTrigger value="teams">チーム ({seriesTeams?.length || 0})</TabsTrigger>
          <TabsTrigger value="tournaments">{t('detail.tournaments')}</TabsTrigger>
          {isOrganizer && (
            <TabsTrigger value="applications">
              申請管理 {applications.filter(a => a.status === 'pending').length > 0 && `(${applications.filter(a => a.status === 'pending').length})`}
            </TabsTrigger>
          )}
          <TabsTrigger value="overview">{t('detail.overview')}</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          {blocks && blocks.length > 0 && teamAgg.size > 0 ? (
            <div className="space-y-6">
              {blocks.map((block) => {
                const blockTeams = Array.from(teamAgg.entries())
                  .filter(([, v]) => v.block_id === block.id)
                  .sort((a, b) => {
                    if (b[1].total_win_points !== a[1].total_win_points) return b[1].total_win_points - a[1].total_win_points
                    if (b[1].round_diff !== a[1].round_diff) return b[1].round_diff - a[1].round_diff
                    if (b[1].match_diff !== a[1].match_diff) return b[1].match_diff - a[1].match_diff
                    return b[1].total_rounds_won - a[1].total_rounds_won
                  })
                return (
                  <Card key={block.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{block.block_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-left">#</th>
                              <th className="px-4 py-2 text-left">チーム</th>
                              <th className="px-4 py-2 text-center">試合</th>
                              <th className="px-4 py-2 text-center">勝</th>
                              <th className="px-4 py-2 text-center">負</th>
                              <th className="px-4 py-2 text-center">勝点</th>
                              <th className="px-4 py-2 text-center">R差</th>
                              <th className="px-4 py-2 text-center">M差</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blockTeams.map(([, team], rank) => (
                              <tr key={rank} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="px-4 py-2 font-medium">{rank + 1}</td>
                                <td className="px-4 py-2 font-medium">{team.team_name}</td>
                                <td className="px-4 py-2 text-center">{team.matches_played}</td>
                                <td className="px-4 py-2 text-center text-green-600">{team.wins}</td>
                                <td className="px-4 py-2 text-center text-red-600">{team.losses}</td>
                                <td className="px-4 py-2 text-center font-bold">{team.total_win_points}</td>
                                <td className="px-4 py-2 text-center">{team.round_diff > 0 ? '+' : ''}{team.round_diff}</td>
                                <td className="px-4 py-2 text-center">{team.match_diff > 0 ? '+' : ''}{team.match_diff}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                まだ試合結果がありません
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-4">
            {/* エントリー申請フォーム（ログインユーザー向け） */}
            {user && !isOrganizer && (
              <TeamApplicationForm seriesId={id} />
            )}

            {/* 参加チーム一覧 */}
            {seriesTeams && seriesTeams.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {seriesTeams.map(team => (
                      <div key={team.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {team.name.charAt(0)}
                          </div>
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Link href={`/teams/${team.id}`}>
                          <Button variant="ghost" size="sm">詳細</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  参加チームはまだありません
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 申請管理（主催者のみ） */}
        {isOrganizer && (
          <TabsContent value="applications">
            <ApplicationManage seriesId={id} applications={applications} />
          </TabsContent>
        )}

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
      </Tabs>
    </div>
  )
}
