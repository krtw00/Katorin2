export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.id === tournament.organizer_id
  const isTeam = tournament.entry_type === 'team'

  // チーム戦: ブロック・チームエントリー・試合数
  let blocks: { id: string; block_name: string }[] = []
  let teamEntryCount = 0
  let matchStats = { total: 0, completed: 0 }

  if (isTeam) {
    const { data: b } = await supabase
      .from('tournament_blocks')
      .select('id, block_name')
      .eq('tournament_id', id)
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{tournament.title}</CardTitle>
              <CardDescription className="mt-1">
                {isTeam
                  ? `${teamEntryCount} チーム参加`
                  : `${participantCount} / ${tournament.max_participants} 人`
                }
              </CardDescription>
            </div>
            <Badge variant={statusVariant[tournament.status] || 'outline'} className="shrink-0">
              {tournamentStatusLabels[tournament.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* 大会情報 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold">大会情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">形式</span>
                  <span>{tournamentFormatLabels[tournament.tournament_format]}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">対戦形式</span>
                  <span>{matchFormatLabels[tournament.match_format]}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">参加形式</span>
                  <span>{isTeam ? 'チーム戦' : '個人戦'}</span>
                </div>
                {isTeam && (
                  <>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">オーダー</span>
                      <span>{tournament.order_size}人 + サブ{tournament.sub_count}人</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">ラウンド</span>
                      <span>{tournament.players_per_round}v{tournament.players_per_round} × {tournament.rounds_to_win}先取</span>
                    </div>
                    {blocks.length > 0 && (
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">ブロック</span>
                        <span>{blocks.map(b => b.block_name).join(', ')}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">開催日</span>
                  <span>{formatDate(tournament.start_at)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">主催者</span>
                  <span>{organizerName}</span>
                </div>
              </div>
            </div>

            {/* 進行状況（チーム戦） */}
            {isTeam && matchStats.total > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">進行状況</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">試合進行</span>
                    <span className="font-mono">{matchStats.completed} / {matchStats.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${matchStats.total > 0 ? (matchStats.completed / matchStats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 説明 */}
            {tournament.description && (
              <div className={isTeam && matchStats.total > 0 ? 'md:col-span-2' : ''}>
                <h3 className="font-semibold mb-2">説明</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 flex-wrap border-t pt-6">
          {/* チーム戦用ナビゲーション */}
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

          {/* 個人戦用ナビゲーション */}
          {!isTeam && (
            <>
              {tournament.status === 'recruiting' && user && (
                <Link href={`/tournaments/${id}/entry`}>
                  <Button>エントリーする</Button>
                </Link>
              )}
              {tournament.status === 'recruiting' && !user && (
                <Link href="/login">
                  <Button variant="outline">ログインしてエントリー</Button>
                </Link>
              )}
              <Link href={`/tournaments/${id}/bracket`}>
                <Button variant="outline">トーナメント表</Button>
              </Link>
              <Link href={`/tournaments/${id}/ranking`}>
                <Button variant="outline">ランキング</Button>
              </Link>
            </>
          )}

          {/* 共通: 管理画面 */}
          {isOrganizer && (
            <Link href={`/tournaments/${id}/manage`}>
              <Button variant="outline">管理画面</Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
