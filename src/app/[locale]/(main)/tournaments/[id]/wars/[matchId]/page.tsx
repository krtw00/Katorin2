export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { WarResultForm } from '@/components/tournament/WarResultForm'

type Props = {
  params: Promise<{ id: string; matchId: string }>
}

export default async function WarDetailPage({ params }: Props) {
  const { id, matchId } = await params
  const supabase = await createClient()

  // 大会情報
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  // War(match)情報
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(id, name, avatar_url),
      team2:teams!matches_team2_id_fkey(id, name, avatar_url)
    `)
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  // オーダー
  const { data: orders } = await supabase
    .from('war_orders')
    .select('*, user:profiles(*)')
    .eq('match_id', matchId)
    .order('slot', { ascending: true })

  // ラウンド結果
  const { data: warRounds } = await supabase
    .from('war_rounds')
    .select('*')
    .eq('match_id', matchId)
    .order('round_number', { ascending: true })

  // 個別試合結果
  const { data: individualMatches } = await supabase
    .from('individual_matches')
    .select('*, player1:profiles!individual_matches_player1_id_fkey(*), player2:profiles!individual_matches_player2_id_fkey(*)')
    .eq('match_id', matchId)
    .order('play_order', { ascending: true })

  // 権限チェック
  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.id === tournament.organizer_id

  const team1 = (Array.isArray(match.team1) ? match.team1[0] : match.team1) as { id: string; name: string; avatar_url: string | null } | null
  const team2 = (Array.isArray(match.team2) ? match.team2[0] : match.team2) as { id: string; name: string; avatar_url: string | null } | null
  const team1Orders = orders?.filter(o => o.team_id === match.team1_id) || []
  const team2Orders = orders?.filter(o => o.team_id === match.team2_id) || []

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div>
        <Link href={`/tournaments/${id}/wars`}>
          <Button variant="ghost" size="sm">← War一覧</Button>
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
        </h1>
        <p className="text-sm text-muted-foreground">{tournament.title} / Week {match.round}</p>
      </div>

      {/* スコアカード */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-lg font-bold">{team1?.name}</p>
              {match.status === 'completed' && match.winner_team_id === match.team1_id && (
                <Badge className="bg-green-600 mt-1">WIN</Badge>
              )}
            </div>
            <div className="text-center">
              {match.status === 'completed' ? (
                <div>
                  <p className="text-4xl font-bold">{match.team1_round_wins} - {match.team2_round_wins}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    個人マッチ {match.team1_wins} - {match.team2_wins}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-muted-foreground">VS</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{team2?.name}</p>
              {match.status === 'completed' && match.winner_team_id === match.team2_id && (
                <Badge className="bg-green-600 mt-1">WIN</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* オーダー */}
      {(team1Orders.length > 0 || team2Orders.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>オーダー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* チーム1 */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">{team1?.name}</h3>
                <div className="space-y-1">
                  {team1Orders.map(o => {
                    const user = o.user as { display_name: string } | null
                    return (
                      <div key={o.id} className={`flex items-center gap-2 p-2 rounded text-sm ${o.is_banned ? 'bg-red-50 dark:bg-red-900/20 line-through opacity-60' : o.is_picked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                        <span className="font-mono text-xs text-muted-foreground w-4">{o.slot}</span>
                        <span className="font-medium">{user?.display_name}</span>
                        <span className="text-muted-foreground">{o.deck_name}</span>
                        {o.is_banned && <Badge variant="destructive" className="text-xs h-5">Ban</Badge>}
                        {o.is_picked && <Badge className="text-xs h-5 bg-green-600">Pick</Badge>}
                        {o.is_sub && <Badge variant="outline" className="text-xs h-5">Sub</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* チーム2 */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">{team2?.name}</h3>
                <div className="space-y-1">
                  {team2Orders.map(o => {
                    const user = o.user as { display_name: string } | null
                    return (
                      <div key={o.id} className={`flex items-center gap-2 p-2 rounded text-sm ${o.is_banned ? 'bg-red-50 dark:bg-red-900/20 line-through opacity-60' : o.is_picked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                        <span className="font-mono text-xs text-muted-foreground w-4">{o.slot}</span>
                        <span className="font-medium">{user?.display_name}</span>
                        <span className="text-muted-foreground">{o.deck_name}</span>
                        {o.is_banned && <Badge variant="destructive" className="text-xs h-5">Ban</Badge>}
                        {o.is_picked && <Badge className="text-xs h-5 bg-green-600">Pick</Badge>}
                        {o.is_sub && <Badge variant="outline" className="text-xs h-5">Sub</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ラウンド結果 */}
      {warRounds && warRounds.length > 0 && (
        <div className="space-y-4">
          {warRounds.map(wr => {
            const roundMatches = individualMatches?.filter(im =>
              im.war_round_id === wr.id
            ) || []

            return (
              <Card key={wr.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Round {wr.round_number}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {wr.team1_match_wins} - {wr.team2_match_wins}
                      </span>
                      {wr.status === 'completed' && wr.winner_team_id && (
                        <Badge variant="secondary" className="text-xs">
                          {wr.winner_team_id === match.team1_id ? team1?.name : team2?.name} 勝利
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {roundMatches.map(im => {
                      const p1 = im.player1 as { display_name: string } | null
                      const p2 = im.player2 as { display_name: string } | null
                      const p1Won = im.winner_id === im.player1_id
                      return (
                        <div key={im.id} className="grid grid-cols-[1fr_auto_1fr] gap-2 p-2 rounded text-sm items-center">
                          <div className={`text-right ${p1Won ? 'font-bold text-green-600 dark:text-green-400' : ''}`}>
                            {p1?.display_name}
                          </div>
                          <div className="font-mono text-center min-w-[50px]">
                            {im.player1_score} - {im.player2_score}
                          </div>
                          <div className={`${!p1Won ? 'font-bold text-green-600 dark:text-green-400' : ''}`}>
                            {p2?.display_name}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 結果入力フォーム（主催者のみ、未完了時） */}
      {isOrganizer && match.status !== 'completed' && (
        <WarResultForm
          matchId={matchId}
          tournamentId={id}
          team1Id={match.team1_id!}
          team2Id={match.team2_id!}
          team1Name={team1?.name || 'Team 1'}
          team2Name={team2?.name || 'Team 2'}
          team1Members={team1Orders.filter(o => !o.is_banned).map(o => ({
            userId: o.user_id,
            displayName: (o.user as { display_name: string } | null)?.display_name || '',
            deckName: o.deck_name,
          }))}
          team2Members={team2Orders.filter(o => !o.is_banned).map(o => ({
            userId: o.user_id,
            displayName: (o.user as { display_name: string } | null)?.display_name || '',
            deckName: o.deck_name,
          }))}
          playersPerRound={tournament.players_per_round || 3}
          roundsToWin={tournament.rounds_to_win || 2}
          matchFormat={tournament.match_format}
        />
      )}
    </div>
  )
}
