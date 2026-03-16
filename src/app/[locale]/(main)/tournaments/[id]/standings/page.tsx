export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type Props = {
  params: Promise<{ id: string }>
}

export default async function StandingsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 全クエリを並列取得
  const [{ data: tournament }, { data: blocks }, { data: blockStandings }, { data: swissRankings }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('tournament_blocks')
      .select('*')
      .eq('tournament_id', id)
      .order('block_order', { ascending: true }),
    supabase
      .from('block_standings')
      .select('*')
      .eq('tournament_id', id),
    supabase
      .from('swiss_rankings')
      .select('*')
      .eq('tournament_id', id),
  ])

  if (!tournament) notFound()

  const isRoundRobin = tournament.tournament_format === 'round_robin'

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href={`/tournaments/${id}`}>
          <Button variant="ghost" size="sm">← 大会詳細</Button>
        </Link>
        <h1 className="text-2xl font-bold mt-2">順位表</h1>
        <p className="text-sm text-muted-foreground">{tournament.title}</p>
      </div>

      {isRoundRobin && blocks && blocks.length > 0 ? (
        // ブロック別順位表
        blocks.map(block => {
          const standings = blockStandings
            ?.filter(s => s.block_id === block.id)
            .sort((a, b) => (a.rank as number) - (b.rank as number)) || []

          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle>{block.block_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">順位</TableHead>
                      <TableHead>チーム</TableHead>
                      <TableHead className="text-center w-16">勝</TableHead>
                      <TableHead className="text-center w-16">敗</TableHead>
                      <TableHead className="text-center w-20">勝点</TableHead>
                      <TableHead className="text-center w-24">ラウンド差</TableHead>
                      <TableHead className="text-center w-24">マッチ差</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map(s => (
                      <TableRow key={s.team_id} className={(s.rank ?? 999) <= 2 ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                        <TableCell>
                          {(s.rank ?? 999) <= 1 ? (
                            <Badge className="bg-yellow-500">1</Badge>
                          ) : (s.rank ?? 999) <= 3 ? (
                            <Badge variant="secondary">{(s.rank ?? 999)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{(s.rank ?? 999)}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{s.team_name}</TableCell>
                        <TableCell className="text-center font-mono">{s.wins}</TableCell>
                        <TableCell className="text-center font-mono">{s.losses}</TableCell>
                        <TableCell className="text-center font-bold">{s.total_win_points}</TableCell>
                        <TableCell className="text-center font-mono">
                          <span className={(s.round_diff ?? 0) > 0 ? 'text-green-600' : (s.round_diff ?? 0) < 0 ? 'text-red-600' : ''}>
                            {(s.round_diff ?? 0) > 0 ? '+' : ''}{(s.round_diff ?? 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          <span className={(s.match_diff ?? 0) > 0 ? 'text-green-600' : (s.match_diff ?? 0) < 0 ? 'text-red-600' : ''}>
                            {(s.match_diff ?? 0) > 0 ? '+' : ''}{(s.match_diff ?? 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })
      ) : swissRankings && swissRankings.length > 0 ? (
        // スイスドロー順位表
        <Card>
          <CardHeader>
            <CardTitle>スイスドロー順位表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">順位</TableHead>
                  <TableHead>チーム</TableHead>
                  <TableHead className="text-center w-16">TP</TableHead>
                  <TableHead className="text-center w-16">WP</TableHead>
                  <TableHead className="text-center w-20">対戦数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swissRankings.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(s => (
                  <TableRow key={s.team_id} className={(s.rank ?? 999) <= 4 ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                    <TableCell>
                      <Badge variant={(s.rank ?? 999) <= 4 ? 'default' : 'outline'}>{(s.rank ?? 999)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{s.team_name}</TableCell>
                    <TableCell className="text-center font-bold">{s.total_team_points}</TableCell>
                    <TableCell className="text-center font-mono">{s.total_win_points}</TableCell>
                    <TableCell className="text-center font-mono">{s.rounds_played}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            まだ順位データがありません
          </CardContent>
        </Card>
      )}
    </div>
  )
}
