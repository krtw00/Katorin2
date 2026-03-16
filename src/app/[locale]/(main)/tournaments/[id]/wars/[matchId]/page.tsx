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
import { getTournamentConfig } from '@/lib/tournament-config'

type Props = {
  params: Promise<{ id: string; matchId: string }>
}

export default async function WarDetailPage({ params }: Props) {
  const { id, matchId } = await params
  const supabase = await createClient()

  // tournament と match を並列取得（第1段）
  const [{ data: tournament }, { data: match }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*, series:series(id, title)')
      .eq('id', id)
      .single(),
    supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name, avatar_url),
        team2:teams!matches_team2_id_fkey(id, name, avatar_url)
      `)
      .eq('id', matchId)
      .single(),
  ])

  if (!tournament) notFound()
  if (!match) notFound()

  const seriesInfo = tournament.series as { id: string; title: string } | null

  // 第2段: config, orders, warRounds, individualMatches, user を並列取得
  const [config, { data: orders }, { data: warRounds }, { data: individualMatches }, { data: { user } }] = await Promise.all([
    getTournamentConfig(supabase, id),
    supabase
      .from('war_orders')
      .select('*, user:profiles(*)')
      .eq('match_id', matchId)
      .order('slot', { ascending: true }),
    supabase
      .from('war_rounds')
      .select('*')
      .eq('match_id', matchId)
      .order('round_number', { ascending: true }),
    supabase
      .from('individual_matches')
      .select('*, player1:profiles!individual_matches_player1_id_fkey(*), player2:profiles!individual_matches_player2_id_fkey(*)')
      .eq('match_id', matchId)
      .order('play_order', { ascending: true }),
    supabase.auth.getUser(),
  ])

  const isOrganizer = user?.id === tournament.organizer_id

  const team1 = (Array.isArray(match.team1) ? match.team1[0] : match.team1) as { id: string; name: string; avatar_url: string | null } | null
  const team2 = (Array.isArray(match.team2) ? match.team2[0] : match.team2) as { id: string; name: string; avatar_url: string | null } | null
  const team1Orders = orders?.filter(o => o.team_id === match.team1_id) || []
  const team2Orders = orders?.filter(o => o.team_id === match.team2_id) || []

  const isCompleted = match.status === 'completed'
  const team1Won = isCompleted && match.winner_team_id === match.team1_id
  const team2Won = isCompleted && match.winner_team_id === match.team2_id

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {seriesInfo && (
          <>
            <Link href={`/series/${seriesInfo.id}`} className="hover:text-foreground transition-colors">{seriesInfo.title}</Link>
            <span>/</span>
          </>
        )}
        <Link href={`/tournaments/${id}/wars`} className="hover:text-foreground transition-colors">War一覧</Link>
        <span>/</span>
        <span className="text-foreground">{team1?.name} vs {team2?.name}</span>
      </nav>

      {/* スコアカード */}
      <Card className="overflow-hidden">
        <div className={`h-1 ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <CardContent className="py-8">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* チーム1 */}
            <div className="text-center space-y-2">
              <p className={`text-xl font-bold ${team1Won ? 'text-green-600 dark:text-green-400' : ''}`}>
                {team1?.name}
              </p>
              {team1Won && <Badge className="bg-green-600">WIN</Badge>}
            </div>

            {/* スコア中央 */}
            <div className="text-center px-6">
              {isCompleted ? (
                <div className="space-y-1">
                  <p className="text-5xl font-black tracking-tight">
                    {match.team1_round_wins}
                    <span className="text-muted-foreground mx-2">-</span>
                    {match.team2_round_wins}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    個人マッチ {match.team1_wins} - {match.team2_wins}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-4xl font-black text-muted-foreground/50">VS</p>
                  <Badge variant="outline" className="mt-2">
                    {match.status === 'pending' ? '未開始' : '進行中'}
                  </Badge>
                </div>
              )}
            </div>

            {/* チーム2 */}
            <div className="text-center space-y-2">
              <p className={`text-xl font-bold ${team2Won ? 'text-green-600 dark:text-green-400' : ''}`}>
                {team2?.name}
              </p>
              {team2Won && <Badge className="bg-green-600">WIN</Badge>}
            </div>
          </div>
        </CardContent>
        {isCompleted && (
          <div className="border-t px-6 py-3 flex justify-center">
            <a href={`/api/images/war-result/${matchId}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">結果画像を開く →</Button>
            </a>
          </div>
        )}
      </Card>

      {/* オーダー提出ボタン */}
      {!isCompleted && user && (isOrganizer || team1Orders.length === 0 || team2Orders.length === 0) && (
        <div className="flex gap-2">
          <Link href={`/tournaments/${id}/wars/${matchId}/order`}>
            <Button>オーダー{team1Orders.length > 0 || team2Orders.length > 0 ? '編集' : '提出'}</Button>
          </Link>
        </div>
      )}

      {/* オーダー */}
      {(team1Orders.length > 0 || team2Orders.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">オーダー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { team: team1, orders: team1Orders },
                { team: team2, orders: team2Orders },
              ].map(({ team, orders: teamOrders }) => (
                <div key={team?.id}>
                  <h3 className="font-semibold text-sm mb-3 pb-2 border-b">{team?.name}</h3>
                  <div className="space-y-1.5">
                    {teamOrders.map(o => {
                      const u = o.user as { display_name: string } | null
                      const isBanned = o.is_banned
                      const isPicked = o.is_picked
                      return (
                        <div key={o.id} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          isBanned ? 'bg-red-50 dark:bg-red-950/30 opacity-50 line-through' :
                          isPicked ? 'bg-green-50 dark:bg-green-950/30' :
                          'bg-muted/30'
                        }`}>
                          <span className="font-mono text-xs text-muted-foreground w-5 text-center">{o.slot}</span>
                          <span className="font-medium flex-1">{u?.display_name}</span>
                          <span className="text-muted-foreground text-xs">{o.deck_name}</span>
                          <div className="flex gap-1">
                            {isBanned && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Ban</Badge>}
                            {isPicked && <Badge className="text-[10px] h-4 px-1.5 bg-green-600">Pick</Badge>}
                            {o.is_sub && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Sub</Badge>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ラウンド結果 */}
      {warRounds && warRounds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">ラウンド詳細</h2>
          {warRounds.map(wr => {
            const roundMatches = individualMatches?.filter(im => im.war_round_id === wr.id) || []
            const roundWinner = wr.winner_team_id === match.team1_id ? team1 : team2
            return (
              <Card key={wr.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Round {wr.round_number}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold">
                        {wr.team1_match_wins} - {wr.team2_match_wins}
                      </span>
                      {wr.status === 'completed' && wr.winner_team_id && (
                        <Badge variant="secondary" className="text-xs">
                          {roundWinner?.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {roundMatches.map(im => {
                      const p1 = im.player1 as { display_name: string } | null
                      const p2 = im.player2 as { display_name: string } | null
                      const p1Won = im.winner_id === im.player1_id
                      return (
                        <div key={im.id} className="grid grid-cols-[1fr_auto_1fr] gap-3 py-2.5 items-center">
                          <div className={`text-right text-sm ${p1Won ? 'font-bold text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {p1?.display_name}
                          </div>
                          <div className="font-mono text-center text-sm font-bold min-w-[50px] bg-muted/50 rounded px-2 py-0.5">
                            {im.player1_score} - {im.player2_score}
                          </div>
                          <div className={`text-sm ${!p1Won ? 'font-bold text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
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

      {/* 結果入力フォーム */}
      {isOrganizer && !isCompleted && (
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
          playersPerRound={config.playersPerRound}
          roundsToWin={config.roundsToWin ?? 2}
          matchFormat={config.matchFormat as 'bo1' | 'bo3' | 'bo5'}
        />
      )}
    </div>
  )
}
