export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Search, User } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/common/EmptyState'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ team_id?: string }>
}

type MemberDeckHistory = {
  userId: string
  displayName: string
  avatarUrl: string | null
  history: {
    tournamentTitle: string
    roundNumber: number | null
    deckName: string
    deckTheme: string
  }[]
}

export default async function ScoutingPage({ params, searchParams }: Props) {
  const { id } = await params
  const { team_id: selectedTeamId } = await searchParams
  const supabase = await createClient()

  const { data: series, error } = await supabase
    .from('series')
    .select('id, title')
    .eq('id', id)
    .single()

  if (error || !series) notFound()

  // シリーズ配下のチーム一覧
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, avatar_url')
    .eq('series_id', id)
    .order('name')

  // シリーズ配下の全大会
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, title, round_number')
    .eq('series_id', id)
    .order('round_number', { ascending: true })
    .order('start_at', { ascending: true })

  const tournamentIds = tournaments?.map(t => t.id) || []
  const tournamentMap = new Map(tournaments?.map(t => [t.id, t]) || [])

  // 選択されたチームのスカウティングデータ
  let memberHistories: MemberDeckHistory[] = []

  if (selectedTeamId && tournamentIds.length > 0) {
    // 全matchを取得
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, tournament_id')
      .in('tournament_id', tournamentIds)

    const matchIds = allMatches?.map(m => m.id) || []
    const matchTournamentMap = new Map(allMatches?.map(m => [m.id, m.tournament_id]) || [])

    if (matchIds.length > 0) {
      // 対象チームのwar_ordersを取得
      const { data: orders } = await supabase
        .from('war_orders')
        .select('*, user:profiles(id, display_name, avatar_url)')
        .eq('team_id', selectedTeamId)
        .in('match_id', matchIds)
        .order('slot', { ascending: true })

      if (orders && orders.length > 0) {
        // ユーザーごとにグルーピング
        const userMap = new Map<string, MemberDeckHistory>()
        for (const o of orders) {
          const user = o.user as { id: string; display_name: string; avatar_url: string | null } | null
          if (!user) continue

          const tournamentId = matchTournamentMap.get(o.match_id)
          const tournament = tournamentId ? tournamentMap.get(tournamentId) : null

          if (!userMap.has(user.id)) {
            userMap.set(user.id, {
              userId: user.id,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
              history: [],
            })
          }

          userMap.get(user.id)!.history.push({
            tournamentTitle: tournament?.title || '不明',
            roundNumber: tournament?.round_number ?? null,
            deckName: o.deck_name,
            deckTheme: o.deck_theme?.trim() || o.deck_name,
          })
        }

        memberHistories = Array.from(userMap.values())
      }
    }
  }

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/series" className="hover:text-foreground transition-colors">シリーズ</Link>
        <span>/</span>
        <Link href={`/series/${id}`} className="hover:text-foreground transition-colors">{series.title}</Link>
        <span>/</span>
        <span className="text-foreground">スカウティング</span>
      </nav>

      <div className="flex items-center gap-3">
        <Search className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">スカウティング</h1>
      </div>

      {/* チーム選択 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">チームを選択</CardTitle>
        </CardHeader>
        <CardContent>
          {teams && teams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teams.map(team => (
                <Link
                  key={team.id}
                  href={`/series/${id}/scouting?team_id=${team.id}`}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedTeamId === team.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Avatar className="h-5 w-5">
                    {team.avatar_url && <AvatarImage src={team.avatar_url} alt="" />}
                    <AvatarFallback className="text-[10px] font-bold">
                      {team.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {team.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">参加チームがありません</p>
          )}
        </CardContent>
      </Card>

      {/* スカウティング結果 */}
      {selectedTeamId && (
        <>
          {memberHistories.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{selectedTeam?.name}</h2>
                <Badge variant="outline">{memberHistories.length}名</Badge>
              </div>

              {memberHistories.map(member => (
                <Card key={member.userId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                        <AvatarFallback className="text-xs font-bold">
                          {member.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-base">{member.displayName}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {member.history.map((h, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 text-sm">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {h.roundNumber != null ? `第${h.roundNumber}節` : h.tournamentTitle}
                          </Badge>
                          <span className="font-medium">{h.deckTheme}</span>
                          {h.deckTheme !== h.deckName && (
                            <span className="text-muted-foreground text-xs">({h.deckName})</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 使用テーマサマリ */}
                    {member.history.length > 1 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(
                            member.history.reduce((acc, h) => {
                              acc.set(h.deckTheme, (acc.get(h.deckTheme) || 0) + 1)
                              return acc
                            }, new Map<string, number>())
                          ).map(([theme, count]) => (
                            <Badge key={theme} variant="secondary" className="text-xs">
                              {theme} x{count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState icon={User} message="このチームのデッキデータがありません" />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
