import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Users, User, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  LeagueWithOrganizer,
} from '@/types/league'
import { TournamentWithOrganizer } from '@/types/round'
import { TournamentListItem } from '@/components/tournament/TournamentListItem'
import { TeamApplicationForm } from '@/components/league/TeamApplicationForm'
import { ApplicationManage } from '@/components/league/ApplicationManage'
import { BannerImage } from '@/components/common/BannerImage'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { MetaItem } from '@/components/common/MetaItem'
import { EmptyState } from '@/components/common/EmptyState'
import { ManualPointsConfirm } from '@/components/league/ManualPointsConfirm'
import { BlockAssignment } from '@/components/league/BlockAssignment'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SeriesDetailPage({ params }: Props) {
  const t = await getTranslations('leagues')
  const tl = await getTranslations('labels')
  const { id } = await params
  const supabase = await createClient()

  // 並列取得: series, tournaments, blocks, teams, user を同時にフェッチ
  const [
    { data: league, error },
    { data: tournaments },
    { data: blocks },
    { data: seriesTeams },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select(`*, organizer:profiles!leagues_organizer_id_fkey(*)`)
      .eq('id', id)
      .single()
      .then(r => r as unknown as { data: LeagueWithOrganizer | null; error: unknown }),
    supabase
      .from('rounds')
      .select(`*, organizer:profiles!rounds_organizer_id_fkey(*)`)
      .eq('league_id', id)
      .order('round_order', { ascending: true })
      .order('start_at', { ascending: true })
      .then(r => r as unknown as { data: TournamentWithOrganizer[] | null }),
    supabase
      .from('round_blocks')
      .select('*')
      .eq('league_id', id)
      .order('block_order', { ascending: true }),
    supabase
      .from('teams')
      .select('id, name, leader_id, avatar_url')
      .eq('league_id', id),
    supabase.auth.getUser(),
  ])

  if (error || !league) {
    notFound()
  }

  const isOrganizer = user?.id === league.organizer_id

  // 第2段: tournaments依存のクエリ + applicationsを並列取得
  const tournamentIds = tournaments?.map((t) => t.id) || []

  const [standingsResult, participantCountsResult, applicationsResult, leaguePointsResult, teamEntriesResult] = await Promise.all([
    // block_standings
    tournamentIds.length > 0
      ? supabase.from('round_block_standings').select('*').in('round_id', tournamentIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : Promise.resolve({ data: [] as any[] }),
    // participant counts
    tournamentIds.length > 0
      ? supabase.from('participants').select('round_id').in('round_id', tournamentIds)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then(r => r as any as { data: { round_id: string }[] | null })
      : Promise.resolve({ data: [] as { round_id: string }[] }),
    // applications (RLS制限あり)
    user
      ? supabase
          .from('team_applications')
          .select('*, team:teams(id, name, leader_id, leader:profiles!teams_leader_id_fkey(display_name))')
          .eq('league_id', id)
          .order('applied_at', { ascending: false })
      : Promise.resolve({ data: null }),
    // series_points (auto-calculated)
    tournamentIds.length > 0
      ? supabase.from('league_points').select('round_id').eq('league_id', id)
      : Promise.resolve({ data: [] as { round_id: string }[] }),
    // team_entries のblock_id（ブロック振り分け用）
    tournamentIds.length > 0
      ? supabase.from('team_entries').select('team_id, block_id').eq('round_id', tournamentIds[0])
      : Promise.resolve({ data: [] as { team_id: string; block_id: string | null }[] }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allStandings: any[] = ('data' in standingsResult ? standingsResult.data : []) || []

  // チーム→ブロック マッピング
  const teamBlockEntries = ('data' in teamEntriesResult ? teamEntriesResult.data : []) as { team_id: string; block_id: string | null }[] | null
  const teamBlockMap: Record<string, string | null> = {}
  teamBlockEntries?.forEach(e => { teamBlockMap[e.team_id] = e.block_id })

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

  // Extract calculated tournament IDs
  const spData = ('data' in leaguePointsResult ? leaguePointsResult.data : []) as { round_id: string }[] | null
  const calculatedTournamentIds = [...new Set((spData || []).map(sp => sp.round_id))]

  const countMap = new Map<string, number>()
  const participantCounts = ('data' in participantCountsResult ? participantCountsResult.data : []) as { round_id: string }[] | null
  participantCounts?.forEach((p) => {
    countMap.set(p.round_id, (countMap.get(p.round_id) || 0) + 1)
  })

  // applications処理
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let applications: any[] = []
  const apps = applicationsResult.data
  if (apps?.length) {
    const teamIds = apps.map((a: { team_id: string }) => a.team_id)
    const { data: memberCounts } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)

    const appCountMap = new Map<string, number>()
    memberCounts?.forEach(m => {
      appCountMap.set(m.team_id, (appCountMap.get(m.team_id) || 0) + 1)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applications = apps.map((a: any) => {
      const team = a.team as { id: string; name: string; leader_id: string; leader: { display_name: string } | { display_name: string }[] | null } | null
      const leader = team?.leader
      const leaderName = leader ? (Array.isArray(leader) ? leader[0]?.display_name : leader.display_name) : ''
      return {
        id: a.id,
        team_id: a.team_id,
        team_name: team?.name || '',
        leader_name: leaderName,
        member_count: appCountMap.get(a.team_id) || 0,
        status: a.status,
        message: a.message,
        applied_at: a.applied_at,
      }
    })
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero Banner */}
      <BannerImage
        src={league.cover_image_url}
        alt={league.title}
        id={league.id}
        variant="hero"
        priority
        className="mb-4"
      />

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-xl font-bold sm:text-2xl">{league.title}</h1>
          <StatusIndicator status={league.status} label={tl(`seriesStatus.${league.status}`)} size="md" />
          <Badge variant="outline" className="text-xs">
            {league.entry_type === 'individual' ? t('entryType.individual') : t('entryType.team')}
          </Badge>
        </div>
        <MetaItem icon={User} className="text-sm">{league.organizer.display_name}</MetaItem>
        {isOrganizer && (
          <div className="flex gap-2 mt-3">
            <Link href={`/leagues/${id}/edit`}>
              <Button variant="outline" size="sm">{t('detail.edit')}</Button>
            </Link>
            <Link href={`/tournaments/new?league_id=${id}`}>
              <Button size="sm">{t('detail.addTournament')}</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-lg font-bold leading-none">{tournaments?.length || 0}</div>
              <div className="text-xs text-muted-foreground">{t('detail.tournamentCount')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-lg font-bold leading-none">{seriesTeams?.length || 0}</div>
              <div className="text-xs text-muted-foreground">{t('detail.teams')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <StatusIndicator status={league.status} showIcon showDot={false} className="shrink-0" />
            <div>
              <div className="text-lg font-bold leading-none">{tl(`seriesStatus.${league.status}`)}</div>
              <div className="text-xs text-muted-foreground">{t('detail.status')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="standings">
        <TabsList className="mb-4 w-full overflow-x-auto justify-start">
          <TabsTrigger value="standings">{t('detail.standings')}</TabsTrigger>
          <TabsTrigger value="teams">{t('detail.teams')} ({seriesTeams?.length || 0})</TabsTrigger>
          <TabsTrigger value="tournaments">{t('detail.tournaments')}</TabsTrigger>
          {isOrganizer && (
            <TabsTrigger value="applications">
              {t('detail.applicationManage')} {applications.filter(a => a.status === 'pending').length > 0 && `(${applications.filter(a => a.status === 'pending').length})`}
            </TabsTrigger>
          )}
          <TabsTrigger value="meta">{t('detail.metaAnalysis')}</TabsTrigger>
          <TabsTrigger value="overview">{t('detail.overview')}</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          {/* 主催者向け: 手動ポイント再計算 */}
          {isOrganizer && tournaments && tournaments.length > 0 && (
            <div className="mb-6">
              <ManualPointsConfirm
                leagueId={id}
                tournaments={tournaments}
                calculatedTournamentIds={calculatedTournamentIds}
              />
            </div>
          )}

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
                              <th className="px-3 py-2 text-left w-8">#</th>
                              <th className="px-3 py-2 text-left">{t('detail.standingsTable.team')}</th>
                              <th className="px-3 py-2 text-center hidden sm:table-cell">{t('detail.standingsTable.matches')}</th>
                              <th className="px-3 py-2 text-center">{t('detail.standingsTable.wins')}</th>
                              <th className="px-3 py-2 text-center">{t('detail.standingsTable.losses')}</th>
                              <th className="px-3 py-2 text-center">{t('detail.standingsTable.winPoints')}</th>
                              <th className="px-3 py-2 text-center hidden md:table-cell">{t('detail.standingsTable.roundDiff')}</th>
                              <th className="px-3 py-2 text-center hidden md:table-cell">{t('detail.standingsTable.matchDiff')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blockTeams.map(([, team], rank) => (
                              <tr key={rank} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="px-3 py-2 font-medium">{rank + 1}</td>
                                <td className="px-3 py-2 font-medium truncate max-w-[120px] sm:max-w-none">{team.team_name}</td>
                                <td className="px-3 py-2 text-center hidden sm:table-cell">{team.matches_played}</td>
                                <td className="px-3 py-2 text-center text-green-600">{team.wins}</td>
                                <td className="px-3 py-2 text-center text-red-600">{team.losses}</td>
                                <td className="px-3 py-2 text-center font-bold">{team.total_win_points}</td>
                                <td className="px-3 py-2 text-center hidden md:table-cell">{team.round_diff > 0 ? '+' : ''}{team.round_diff}</td>
                                <td className="px-3 py-2 text-center hidden md:table-cell">{team.match_diff > 0 ? '+' : ''}{team.match_diff}</td>
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
                {t('detail.noResults')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-4">
            {/* エントリー申請フォーム（ログインユーザー向け） */}
            {user && !isOrganizer && (
              <TeamApplicationForm leagueId={id} />
            )}

            {/* ブロック振り分け（主催者向け） */}
            {isOrganizer && seriesTeams && seriesTeams.length > 0 && blocks && blocks.length > 0 && (
              <BlockAssignment
                leagueId={id}
                teams={seriesTeams}
                blocks={blocks}
                teamBlockMap={teamBlockMap}
                tournamentIds={tournamentIds}
              />
            )}

            {/* 参加チーム一覧 */}
            {seriesTeams && seriesTeams.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {seriesTeams.map(team => (
                      <Link key={team.id} href={`/teams/${team.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {team.avatar_url && <AvatarImage src={team.avatar_url} alt="" />}
                            <AvatarFallback className="text-xs font-bold">
                              {team.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{team.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <EmptyState icon={Users} message={t('detail.noTeams')} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 申請管理（主催者のみ） */}
        {isOrganizer && (
          <TabsContent value="applications">
            <ApplicationManage leagueId={id} applications={applications} />
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

        <TabsContent value="meta">
          <Card>
            <CardContent className="py-6 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {t('detail.metaDescription')}
              </p>
              <Link href={`/leagues/${id}/meta`}>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {t('detail.openMeta')}
                </button>
              </Link>
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
                {league.description || t('detail.noDescription')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
