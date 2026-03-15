export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { tournamentStatusLabels } from '@/types/tournament'

type Props = {
  params: Promise<{ id: string }>
}

export default async function WarsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, organizer:profiles!tournaments_organizer_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  // ブロック取得
  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*')
    .eq('tournament_id', id)
    .order('block_order', { ascending: true })

  // 全War取得
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(id, name, avatar_url),
      team2:teams!matches_team2_id_fkey(id, name, avatar_url)
    `)
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  // 現在のユーザー
  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.id === tournament.organizer_id

  // ブロックごとにグループ化
  const matchesByBlock = new Map<string, typeof matches>()
  const noBlockMatches: typeof matches = []

  matches?.forEach(m => {
    if (m.block_id) {
      if (!matchesByBlock.has(m.block_id)) matchesByBlock.set(m.block_id, [])
      matchesByBlock.get(m.block_id)!.push(m)
    } else {
      noBlockMatches.push(m)
    }
  })

  // weekごとにグループ化
  function groupByWeek(matchList: NonNullable<typeof matches>) {
    const map = new Map<number, typeof matchList>()
    matchList.forEach(m => {
      if (!map.has(m.round)) map.set(m.round, [])
      map.get(m.round)!.push(m)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'secondary'
      case 'in_progress': return 'default'
      default: return 'outline'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/tournaments/${id}`}>
            <Button variant="ghost" size="sm">← 大会詳細</Button>
          </Link>
          <h1 className="text-2xl font-bold mt-2">{tournament.title}</h1>
          <p className="text-sm text-muted-foreground">
            War一覧 / {tournamentStatusLabels[tournament.status]}
          </p>
        </div>
        <div className="flex gap-2">
          {isOrganizer && (
            <Link href={`/tournaments/${id}/manage`}>
              <Button variant="outline" size="sm">管理画面</Button>
            </Link>
          )}
          <Link href={`/tournaments/${id}/standings`}>
            <Button variant="outline" size="sm">順位表</Button>
          </Link>
        </div>
      </div>

      {/* ブロック別War一覧 */}
      {blocks && blocks.length > 0 ? (
        blocks.map(block => {
          const blockMatches = matchesByBlock.get(block.id) || []
          const weeks = groupByWeek(blockMatches)

          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle>{block.block_name}</CardTitle>
                <CardDescription>{blockMatches.length} 試合</CardDescription>
              </CardHeader>
              <CardContent>
                {weeks.length > 0 ? (
                  <div className="space-y-4">
                    {weeks.map(([week, weekMatches]) => (
                      <div key={week}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Week {week}
                        </h3>
                        <div className="space-y-2">
                          {weekMatches.map(match => (
                            <Link
                              key={match.id}
                              href={`/tournaments/${id}/wars/${match.id}`}
                              className="block"
                            >
                              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="font-medium text-sm min-w-[120px] text-right">
                                    {((Array.isArray(match.team1) ? match.team1[0] : match.team1) as { name: string } | null)?.name || 'TBD'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {match.status === 'completed' ? (
                                      <span className="font-bold text-lg min-w-[60px] text-center">
                                        {match.team1_round_wins} - {match.team2_round_wins}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground min-w-[60px] text-center">
                                        vs
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-sm min-w-[120px]">
                                    {((Array.isArray(match.team2) ? match.team2[0] : match.team2) as { name: string } | null)?.name || 'TBD'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.scheduled_at && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(match.scheduled_at).toLocaleDateString('ja-JP', {
                                        month: 'short', day: 'numeric', weekday: 'short',
                                      })}
                                    </span>
                                  )}
                                  <Badge variant={statusColor(match.status) as 'default' | 'secondary' | 'outline'}>
                                    {match.status === 'completed' ? '完了' : match.status === 'in_progress' ? '進行中' : '未実施'}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">対戦カードはまだありません</p>
                )}
              </CardContent>
            </Card>
          )
        })
      ) : noBlockMatches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>対戦一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {noBlockMatches.map(match => (
                <Link key={match.id} href={`/tournaments/${id}/wars/${match.id}`} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <span>{((Array.isArray(match.team1) ? match.team1[0] : match.team1) as { name: string } | null)?.name || 'TBD'}</span>
                    <span className="font-bold">
                      {match.status === 'completed' ? `${match.team1_round_wins} - ${match.team2_round_wins}` : 'vs'}
                    </span>
                    <span>{((Array.isArray(match.team2) ? match.team2[0] : match.team2) as { name: string } | null)?.name || 'TBD'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            まだ対戦カードがありません
          </CardContent>
        </Card>
      )}
    </div>
  )
}
