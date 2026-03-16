export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
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
import { EmptyState } from '@/components/common/EmptyState'

type Props = {
  params: Promise<{ id: string }>
}

type DeckStat = {
  deck_theme: string
  count: number
  rate: number
}

export default async function DeckStatsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      series:series(id, title)
    `)
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  const seriesInfo = tournament.series as { id: string; title: string } | null

  // この大会のwar_ordersを取得（matchesを介してtournament_idで絞る）
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', id)

  const matchIds = matches?.map(m => m.id) || []

  let tournamentOrders: { deck_theme: string; deck_name: string }[] = []
  if (matchIds.length > 0) {
    const { data: orders } = await supabase
      .from('war_orders')
      .select('deck_theme, deck_name')
      .in('match_id', matchIds)
    tournamentOrders = orders || []
  }

  // deck_themeでグルーピング（空文字はdeck_nameにフォールバック）
  const themeCountMap = new Map<string, number>()
  for (const o of tournamentOrders) {
    const theme = o.deck_theme?.trim() || o.deck_name?.trim() || '不明'
    themeCountMap.set(theme, (themeCountMap.get(theme) || 0) + 1)
  }

  const total = tournamentOrders.length
  const tournamentStats: DeckStat[] = Array.from(themeCountMap.entries())
    .map(([deck_theme, count]) => ({
      deck_theme,
      count,
      rate: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // シリーズ全体の累計（シリーズ配下の場合）
  let seriesStats: DeckStat[] = []
  let seriesTotalOrders = 0
  if (seriesInfo) {
    const { data: allTournaments } = await supabase
      .from('tournaments')
      .select('id')
      .eq('series_id', seriesInfo.id)

    const allTournamentIds = allTournaments?.map(t => t.id) || []
    if (allTournamentIds.length > 0) {
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id')
        .in('tournament_id', allTournamentIds)

      const allMatchIds = allMatches?.map(m => m.id) || []
      if (allMatchIds.length > 0) {
        const { data: allOrders } = await supabase
          .from('war_orders')
          .select('deck_theme, deck_name')
          .in('match_id', allMatchIds)

        const seriesThemeMap = new Map<string, number>()
        for (const o of (allOrders || [])) {
          const theme = o.deck_theme?.trim() || o.deck_name?.trim() || '不明'
          seriesThemeMap.set(theme, (seriesThemeMap.get(theme) || 0) + 1)
        }

        seriesTotalOrders = allOrders?.length || 0
        seriesStats = Array.from(seriesThemeMap.entries())
          .map(([deck_theme, count]) => ({
            deck_theme,
            count,
            rate: seriesTotalOrders > 0 ? Math.round((count / seriesTotalOrders) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count)
      }
    }
  }

  const maxCount = tournamentStats.length > 0 ? tournamentStats[0].count : 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {seriesInfo ? (
          <>
            <Link href="/series" className="hover:text-foreground transition-colors">シリーズ</Link>
            <span>/</span>
            <Link href={`/series/${seriesInfo.id}`} className="hover:text-foreground transition-colors">{seriesInfo.title}</Link>
            <span>/</span>
            <Link href={`/tournaments/${id}`} className="hover:text-foreground transition-colors">{tournament.title}</Link>
            <span>/</span>
            <span className="text-foreground">デッキ統計</span>
          </>
        ) : (
          <>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">大会</Link>
            <span>/</span>
            <Link href={`/tournaments/${id}`} className="hover:text-foreground transition-colors">{tournament.title}</Link>
            <span>/</span>
            <span className="text-foreground">デッキ統計</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">デッキ使用統計</h1>
      </div>

      {/* この大会の統計 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tournament.title}</CardTitle>
            <Badge variant="outline">{total}件</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tournamentStats.length > 0 ? (
            <div className="space-y-4">
              {/* バーチャート */}
              <div className="space-y-2">
                {tournamentStats.map((stat, i) => (
                  <div key={stat.deck_theme} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono w-6 text-right">{i + 1}</span>
                        <span className="font-medium">{stat.deck_theme}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">
                        {stat.count}回 ({stat.rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${maxCount > 0 ? (stat.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* テーブル */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>デッキテーマ</TableHead>
                    <TableHead className="text-right">使用回数</TableHead>
                    <TableHead className="text-right">使用率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournamentStats.map((stat, i) => (
                    <TableRow key={stat.deck_theme}>
                      <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{stat.deck_theme}</TableCell>
                      <TableCell className="text-right tabular-nums">{stat.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{stat.rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={BarChart3} message="デッキデータがありません" />
          )}
        </CardContent>
      </Card>

      {/* シリーズ累計 */}
      {seriesInfo && seriesStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">シリーズ累計: {seriesInfo.title}</CardTitle>
              <Badge variant="outline">{seriesTotalOrders}件</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>デッキテーマ</TableHead>
                  <TableHead className="text-right">使用回数</TableHead>
                  <TableHead className="text-right">使用率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesStats.map((stat, i) => (
                  <TableRow key={stat.deck_theme}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{stat.deck_theme}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
