export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import {
  tournamentStatusLabels,
  tournamentFormatLabels,
  matchFormatLabels,
} from '@/types/tournament'
import { getTournamentConfig } from '@/lib/tournament-config'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*),
      series:series(id, title)
    `)
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.id === tournament.organizer_id
  const isTeam = tournament.entry_type === 'team'
  const config = await getTournamentConfig(supabase, id)

  // シリーズ情報
  const seriesInfo = tournament.series as { id: string; title: string } | null

  // チーム戦: ブロック・チームエントリー・試合数
  let blocks: { id: string; block_name: string }[] = []
  let teamEntryCount = 0
  let matchStats = { total: 0, completed: 0 }

  if (isTeam) {
    // ブロック取得（tournament_id OR series_id で1クエリ）
    const blockFilter = tournament.series_id
      ? `tournament_id.eq.${id},series_id.eq.${tournament.series_id}`
      : `tournament_id.eq.${id}`
    const { data: b } = await supabase
      .from('tournament_blocks')
      .select('id, block_name')
      .or(blockFilter)
      .order('block_order')
    blocks = b || []

    const { count: tc } = await supabase
      .from('team_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id)
    teamEntryCount = tc || 0

    const { data: matches } = await supabase
      .from('matches')
      .select('status')
      .eq('tournament_id', id)
    matchStats.total = matches?.length || 0
    matchStats.completed = matches?.filter(m => m.status === 'completed').length || 0
  }

  // 個人戦: 参加者数
  let participantCount = 0
  if (!isTeam) {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id)
    participantCount = count || 0
  }

  const organizer = tournament.organizer as { display_name: string } | { display_name: string }[] | null
  const organizerName = organizer
    ? (Array.isArray(organizer) ? organizer[0]?.display_name : organizer.display_name)
    : '不明'

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline', published: 'outline', recruiting: 'default',
    in_progress: 'secondary', completed: 'secondary', cancelled: 'destructive',
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  const progressPct = matchStats.total > 0 ? Math.round((matchStats.completed / matchStats.total) * 100) : 0

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
            <span className="text-foreground">{tournament.title}</span>
          </>
        ) : (
          <>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">大会</Link>
            <span>/</span>
            <span className="text-foreground">{tournament.title}</span>
          </>
        )}
      </nav>

      {/* ヘッダーカード */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{tournament.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                主催: {organizerName}
                {tournament.round_number && ` / 第${tournament.round_number}節`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusVariant[tournament.status] || 'outline'}>
                {tournamentStatusLabels[tournament.status]}
              </Badge>
              <Badge variant="outline">
                {isTeam ? 'チーム戦' : '個人戦'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 統計カード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{isTeam ? teamEntryCount : participantCount}</p>
              <p className="text-xs text-muted-foreground">{isTeam ? 'チーム' : '参加者'}</p>
            </div>
            {isTeam && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{matchStats.completed}<span className="text-sm text-muted-foreground">/{matchStats.total}</span></p>
                  <p className="text-xs text-muted-foreground">試合進行</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{config.orderSize}v{config.orderSize}</p>
                  <p className="text-xs text-muted-foreground">対戦形式</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{config.roundsToWin ? `BO${(config.roundsToWin * 2) - 1}` : `${config.roundCount || 3}R`}</p>
                  <p className="text-xs text-muted-foreground">ラウンド</p>
                </div>
              </>
            )}
            {!isTeam && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{tournament.max_participants}</p>
                <p className="text-xs text-muted-foreground">定員</p>
              </div>
            )}
          </div>

          {/* 進行バー（チーム戦） */}
          {isTeam && matchStats.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>進行状況</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* 大会情報テーブル */}
          <div className="border rounded-lg divide-y text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">形式</span>
              <span>{tournamentFormatLabels[tournament.tournament_format]}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">マッチ形式</span>
              <span>{matchFormatLabels[config.matchFormat as 'bo1' | 'bo3' | 'bo5']}</span>
            </div>
            {isTeam && (
              <>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">オーダー</span>
                  <span>メイン{config.orderSize}名{config.subCount > 0 ? ` + サブ${config.subCount}名` : ''}</span>
                </div>
                {config.banPickEnabled && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Ban & Pick</span>
                    <span>{config.banCount}Ban / {config.pickCount}Pick</span>
                  </div>
                )}
                {blocks.length > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">ブロック</span>
                    <span>{blocks.map(b => b.block_name).join(', ')}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">開催日</span>
              <span>{formatDate(tournament.start_at)}</span>
            </div>
          </div>

          {/* 説明 */}
          {tournament.description && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {tournament.description}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 flex-wrap border-t pt-6">
          {isTeam && (
            <>
              <Link href={`/tournaments/${id}/wars`}>
                <Button>War一覧</Button>
              </Link>
              <Link href={`/tournaments/${id}/standings`}>
                <Button variant="outline">順位表</Button>
              </Link>
            </>
          )}
          {!isTeam && (
            <>
              {tournament.status === 'recruiting' && user && (
                <Link href={`/tournaments/${id}/entry`}>
                  <Button>エントリーする</Button>
                </Link>
              )}
              <Link href={`/tournaments/${id}/bracket`}>
                <Button variant="outline">トーナメント表</Button>
              </Link>
            </>
          )}
          {isOrganizer && (
            <Link href={`/tournaments/${id}/manage`}>
              <Button variant="secondary">管理画面</Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
