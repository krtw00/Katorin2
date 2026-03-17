import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PieChart } from '@/components/common/PieChart'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

type WeekDeckData = {
  week: number
  tournamentTitle: string
  tournamentId: string
  decks: Map<string, number>
  total: number
}

export default async function SeriesMetaPage({ params }: Props) {
  const t = await getTranslations('leagues.meta')
  const tNav = await getTranslations('nav')
  const ts = await getTranslations('leagues.detail')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: league, error }, { data: tournaments }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, title')
      .eq('id', id)
      .single(),
    supabase
      .from('rounds')
      .select('id, title, round_order')
      .eq('league_id', id)
      .order('round_order', { ascending: true })
      .order('start_at', { ascending: true }),
  ])

  if (error || !league) notFound()

  const tournamentList = tournaments || []
  const tournamentIds = tournamentList.map(t => t.id)

  // 全matchesを取得
  let allOrders: { match_id: string; deck_theme: string; deck_name: string }[] = []
  let matchTournamentMap = new Map<string, string>()

  // チーム一覧取得
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', id)

  const teamList = teams || []

  // matches + orders 取得
  type MatchRow = { id: string; round_id: string; team1_id: string | null; team2_id: string | null }
  let allMatches: MatchRow[] = []

  if (tournamentIds.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, round_id, team1_id, team2_id')
      .in('round_id', tournamentIds)

    allMatches = (matches as MatchRow[] | null) || []

    if (allMatches.length) {
      for (const m of allMatches) {
        matchTournamentMap.set(m.id, m.round_id)
      }
      const matchIds = allMatches.map(m => m.id)
      const { data: orders } = await supabase
        .from('war_orders')
        .select('match_id, deck_theme, deck_name, team_id')
        .in('match_id', matchIds)
      allOrders = (orders as typeof allOrders) || []
    }
  }

  // チーム×Week のオーダー提出状況
  // 各Weekで各チームが試合に参加しているか、オーダーを提出しているかをチェック
  type OrderStatus = 'submitted' | 'missing' | 'no_match'
  const orderStatusMap = new Map<string, Map<string, OrderStatus>>() // teamId -> tournamentId -> status

  for (const t of teamList) {
    const teamStatuses = new Map<string, OrderStatus>()
    for (const tid of tournamentIds) {
      // このWeekでこのチームの試合があるか
      const hasMatch = allMatches.some(m => m.round_id === tid && (m.team1_id === t.id || m.team2_id === t.id))
      if (!hasMatch) {
        teamStatuses.set(tid, 'no_match')
        continue
      }
      // オーダー提出済みか
      const matchIdsForWeek = allMatches.filter(m => m.round_id === tid && (m.team1_id === t.id || m.team2_id === t.id)).map(m => m.id)
      const hasOrder = allOrders.some(o => matchIdsForWeek.includes(o.match_id) && (o as { team_id?: string }).team_id === t.id)
      teamStatuses.set(tid, hasOrder ? 'submitted' : 'missing')
    }
    orderStatusMap.set(t.id, teamStatuses)
  }

  const missingCount = teamList.reduce((acc, t) => {
    const statuses = orderStatusMap.get(t.id)
    if (!statuses) return acc
    return acc + Array.from(statuses.values()).filter(s => s === 'missing').length
  }, 0)

  // Week別に集計
  const weekDataMap = new Map<string, WeekDeckData>()
  for (const t of tournamentList) {
    weekDataMap.set(t.id, {
      week: t.round_order || 0,
      tournamentTitle: t.title,
      tournamentId: t.id,
      decks: new Map(),
      total: 0,
    })
  }

  for (const o of allOrders) {
    const tid = matchTournamentMap.get(o.match_id)
    if (!tid) continue
    const wd = weekDataMap.get(tid)
    if (!wd) continue
    const theme = o.deck_theme?.trim() || o.deck_name?.trim() || t('unknown')
    wd.decks.set(theme, (wd.decks.get(theme) || 0) + 1)
    wd.total++
  }

  const weekData = Array.from(weekDataMap.values()).filter(w => w.total > 0)

  // 全デッキテーマを収集（出現順）
  const allThemes = new Set<string>()
  const seriesTotal = new Map<string, number>()
  for (const wd of weekData) {
    for (const [theme, count] of wd.decks) {
      allThemes.add(theme)
      seriesTotal.set(theme, (seriesTotal.get(theme) || 0) + count)
    }
  }

  // シリーズ累計でソート
  const sortedThemes = Array.from(seriesTotal.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme)

  const grandTotal = allOrders.length

  // Week間の変遷データ構築
  type TrendData = {
    theme: string
    totalCount: number
    totalRate: number
    weekRates: (number | null)[] // 各Weekでの使用率
    trend: 'up' | 'down' | 'stable' | 'new' | 'gone'
  }

  const trendData: TrendData[] = sortedThemes.map(theme => {
    const weekRates = weekData.map(wd => {
      const count = wd.decks.get(theme) || 0
      return wd.total > 0 ? Math.round((count / wd.total) * 1000) / 10 : null
    })

    // トレンド判定（最初と最後の非null値を比較）
    const nonNullRates = weekRates.filter((r): r is number => r !== null && r > 0)
    let trend: TrendData['trend'] = 'stable'
    if (nonNullRates.length >= 2) {
      const first = nonNullRates[0]
      const last = nonNullRates[nonNullRates.length - 1]
      const diff = last - first
      if (diff > 3) trend = 'up'
      else if (diff < -3) trend = 'down'
      else trend = 'stable'
    } else if (nonNullRates.length === 1) {
      const idx = weekRates.findIndex(r => r !== null && r > 0)
      if (idx === weekRates.length - 1 && weekRates.length > 1) trend = 'new'
      else if (idx === 0 && weekRates.length > 1) trend = 'gone'
    }

    return {
      theme,
      totalCount: seriesTotal.get(theme) || 0,
      totalRate: grandTotal > 0 ? Math.round(((seriesTotal.get(theme) || 0) / grandTotal) * 1000) / 10 : 0,
      weekRates,
      trend,
    }
  })

  const TrendIcon = ({ trend }: { trend: TrendData['trend'] }) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'new': return <Badge variant="default" className="text-[10px] px-1 py-0">NEW</Badge>
      case 'gone': return <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">{t('disappeared')}</Badge>
      default: return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/leagues" className="hover:text-foreground transition-colors">{tNav('leagues')}</Link>
        <span>/</span>
        <Link href={`/leagues/${id}`} className="hover:text-foreground transition-colors">{league.title}</Link>
        <span>/</span>
        <span className="text-foreground">{t('title')}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-xl font-bold sm:text-2xl">{t('title')}</h1>
        </div>
        <Link href={`/leagues/${id}`}>
          <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('backToSeries')}
          </button>
        </Link>
      </div>

      {trendData.length === 0 ? (
        <EmptyState icon={BarChart3} message={t('noData')} />
      ) : (
        <>
          {/* シリーズ全体の円グラフ */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('deckDistribution')}</CardTitle>
                <Badge variant="outline">{t('count', { count: grandTotal })}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PieChart
                data={trendData.slice(0, 10).map(d => ({ label: d.theme, value: d.totalCount }))}
                size={220}
              />
            </CardContent>
          </Card>

          {/* シリーズ全体のメタ分布 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('deckRanking')}</CardTitle>
                <Badge variant="outline">{t('count', { count: grandTotal })}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trendData.slice(0, 15).map((d, i) => (
                  <div key={d.theme} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono w-6 text-right">{i + 1}</span>
                        <span className="font-medium">{d.theme}</span>
                        <TrendIcon trend={d.trend} />
                      </div>
                      <span className="text-muted-foreground tabular-nums">
                        {t('usage', { count: d.totalCount, rate: d.totalRate })}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${trendData[0].totalCount > 0 ? (d.totalCount / trendData[0].totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Week別メタ変遷テーブル */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('metaTrend')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left sticky left-0 bg-muted/50">{t('deck')}</th>
                      <th className="px-3 py-2 text-center w-10">{t('trend')}</th>
                      {weekData.map((wd, i) => (
                        <th key={wd.tournamentId} className="px-3 py-2 text-center whitespace-nowrap">
                          <Link href={`/tournaments/${wd.tournamentId}/deck-stats`} className="hover:text-primary transition-colors">
                            {t('week')} {i + 1}
                          </Link>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-bold">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.slice(0, 20).map(d => (
                      <tr key={d.theme} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium sticky left-0 bg-background truncate max-w-[150px]">
                          {d.theme}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <TrendIcon trend={d.trend} />
                        </td>
                        {d.weekRates.map((rate, wi) => (
                          <td key={wi} className="px-3 py-2 text-center tabular-nums">
                            {rate !== null && rate > 0 ? (
                              <span className={rate >= 15 ? 'font-bold text-primary' : rate >= 8 ? 'font-medium' : 'text-muted-foreground'}>
                                {rate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center tabular-nums font-bold">
                          {d.totalRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Week別サマリカード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {weekData.map((wd, i) => {
              const topDecks = Array.from(wd.decks.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)

              return (
                <Card key={wd.tournamentId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        <Link href={`/tournaments/${wd.tournamentId}/deck-stats`} className="hover:text-primary transition-colors">
                          {t('week')} {i + 1}
                        </Link>
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">{t('count', { count: wd.total })}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{wd.tournamentTitle}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <PieChart
                      data={topDecks.map(([label, value]) => ({ label, value }))}
                      size={140}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* オーダー提出状況 */}
          {teamList.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t('orderStatus')}</CardTitle>
                  {missingCount > 0 && (
                    <Badge variant="destructive">{t('notSubmitted', { count: missingCount })}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left sticky left-0 bg-muted/50">{ts('standingsTable.team')}</th>
                        {weekData.map((_, i) => (
                          <th key={i} className="px-3 py-2 text-center whitespace-nowrap">{t('week')} {i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamList.map(team => {
                        const statuses = orderStatusMap.get(team.id)
                        return (
                          <tr key={team.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium sticky left-0 bg-background truncate max-w-[150px]">
                              {team.name}
                            </td>
                            {weekData.map(wd => {
                              const st = statuses?.get(wd.tournamentId) || 'no_match'
                              return (
                                <td key={wd.tournamentId} className="px-3 py-2 text-center">
                                  {st === 'submitted' && <span className="text-green-500">✓</span>}
                                  {st === 'missing' && <span className="text-red-500 font-bold">✗</span>}
                                  {st === 'no_match' && <span className="text-muted-foreground/30">-</span>}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
