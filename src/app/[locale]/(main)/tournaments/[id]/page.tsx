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
import { getTournamentConfig } from '@/lib/tournament-config'
import { CheckInButton } from '@/components/tournament/CheckInButton'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  // tournament と user を並列取得
  const [{ data: tournament, error }, { data: { user } }] = await Promise.all([
    supabase
      .from('rounds')
      .select(`
        *,
        organizer:profiles!rounds_organizer_id_fkey(*),
        league:leagues(id, title)
      `)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  if (error || !tournament) notFound()

  const isOrganizer = user?.id === tournament.organizer_id
  const isTeam = tournament.entry_type === 'team'

  // シリーズ情報
  const leagueInfo = tournament.league as { id: string; title: string } | null

  // チーム戦 / 個人戦のデータを並列取得
  let blocks: { id: string; block_name: string }[] = []
  let teamEntryCount = 0
  let matchStats = { total: 0, completed: 0 }
  let participantCount = 0
  let config
  let myParticipant: { id: string; checked_in_at: string | null } | null = null
  let isParticipant = false
  let disputedCount = 0

  if (isTeam) {
    const blockFilter = tournament.league_id
      ? `round_id.eq.${id},league_id.eq.${tournament.league_id}`
      : `round_id.eq.${id}`

    const [configResult, { data: b }, { count: tc }, { data: matches }] = await Promise.all([
      getTournamentConfig(supabase, id),
      supabase
        .from('round_blocks')
        .select('id, block_name')
        .or(blockFilter)
        .order('block_order'),
      supabase
        .from('team_entries')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', id),
      supabase
        .from('matches')
        .select('status')
        .eq('round_id', id),
    ])
    config = configResult
    blocks = b || []
    teamEntryCount = tc || 0
    matchStats.total = matches?.length || 0
    matchStats.completed = matches?.filter(m => m.status === 'completed').length || 0
  } else {
    const [configResult, { count }] = await Promise.all([
      getTournamentConfig(supabase, id),
      supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', id),
    ])
    config = configResult
    participantCount = count || 0

    if (user) {
      const { data: mp } = await supabase
        .from('participants')
        .select('id, checked_in_at')
        .eq('round_id', id)
        .eq('user_id', user.id)
        .single()
      myParticipant = mp
      isParticipant = !!myParticipant
    }

    if (isOrganizer) {
      const { data: disputedMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('round_id', id)
        .eq('report_status', 'disputed')
      disputedCount = disputedMatches?.length || 0
    }
  }

  const organizer = tournament.organizer as { display_name: string } | { display_name: string }[] | null
  const organizerName = organizer
    ? (Array.isArray(organizer) ? organizer[0]?.display_name : organizer.display_name)
    : t('tournament.detail.unknown')

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
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {leagueInfo ? (
          <>
            <Link href="/leagues" className="hover:text-foreground transition-colors">{t('nav.leagues')}</Link>
            <span>/</span>
            <Link href={`/leagues/${leagueInfo.id}`} className="hover:text-foreground transition-colors">{leagueInfo.title}</Link>
            <span>/</span>
            <span className="text-foreground">{tournament.title}</span>
          </>
        ) : (
          <>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">{t('nav.tournaments')}</Link>
            <span>/</span>
            <span className="text-foreground">{tournament.title}</span>
          </>
        )}
      </nav>

      {/* ヘッダーカード */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-2xl">{tournament.title}</CardTitle>
              <Badge variant={statusVariant[tournament.status] || 'outline'}>
                {t('labels.tournamentStatus.' + tournament.status)}
              </Badge>
              <Badge variant="outline">
                {isTeam ? t('tournament.detail.teamBattle') : t('tournament.detail.individualBattle')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('tournament.detail.organizer')}: {organizerName}
              {tournament.round_order && ` / ${t('tournament.detail.roundLabel', { n: tournament.round_order })}`}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 統計カード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{isTeam ? teamEntryCount : participantCount}</p>
              <p className="text-xs text-muted-foreground">{isTeam ? t('tournament.detail.teams') : t('tournament.detail.participantsLabel')}</p>
            </div>
            {isTeam && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{matchStats.completed}<span className="text-sm text-muted-foreground">/{matchStats.total}</span></p>
                  <p className="text-xs text-muted-foreground">{t('tournament.detail.matchProgress')}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{config.orderSize}v{config.orderSize}</p>
                  <p className="text-xs text-muted-foreground">{t('tournament.detail.matchFormat')}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{config.roundsToWin ? `BO${(config.roundsToWin * 2) - 1}` : `${config.roundCount || 3}R`}</p>
                  <p className="text-xs text-muted-foreground">{t('tournament.detail.rounds')}</p>
                </div>
              </>
            )}
            {!isTeam && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{tournament.max_participants}</p>
                <p className="text-xs text-muted-foreground">{t('tournament.detail.capacity')}</p>
              </div>
            )}
          </div>

          {/* 進行バー（チーム戦） */}
          {isTeam && matchStats.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t('tournament.detail.progress')}</span>
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
              <span className="text-muted-foreground">{t('tournament.detail.format')}</span>
              <span>{t('labels.tournamentFormat.' + tournament.format)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{t('tournament.detail.matchFormat')}</span>
              <span>{t('labels.matchFormat.' + config.matchFormat)}</span>
            </div>
            {isTeam && (
              <>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{t('tournament.detail.order')}</span>
                  <span>{config.subCount > 0 ? t('tournament.detail.orderDetail', { main: config.orderSize, sub: config.subCount }) : t('tournament.detail.orderDetailNoSub', { main: config.orderSize })}</span>
                </div>
                {config.banPickEnabled && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Ban & Pick</span>
                    <span>{config.banCount}Ban / {config.pickCount}Pick</span>
                  </div>
                )}
                {blocks.length > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{t('tournament.detail.blocks')}</span>
                    <span>{blocks.map(b => b.block_name).join(', ')}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{t('tournament.detail.startDate')}</span>
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

        {disputedCount > 0 && (
          <CardContent>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
              {t('tournament.detail.conflictNotice', { count: disputedCount })}
              <Link href={`/tournaments/${id}/bracket`} className="underline ml-1">
                {t('tournament.detail.checkBracket')}
              </Link>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex gap-2 flex-wrap border-t pt-6">
          {isTeam && (
            <>
              <Link href={`/tournaments/${id}/wars`}>
                <Button>{t('tournament.detail.warList')}</Button>
              </Link>
              <Link href={`/tournaments/${id}/standings`}>
                <Button variant="outline">{t('tournament.detail.standings')}</Button>
              </Link>
              <Link href={`/tournaments/${id}/deck-stats`}>
                <Button variant="outline">{t('tournament.detail.deckStats')}</Button>
              </Link>
            </>
          )}
          {!isTeam && (
            <>
              {tournament.status === 'recruiting' && user && !isParticipant && (
                <Link href={`/tournaments/${id}/entry`}>
                  <Button>{t('tournament.detail.entry')}</Button>
                </Link>
              )}
              {myParticipant && (
                <CheckInButton
                  participantId={myParticipant.id}
                  checkedInAt={myParticipant.checked_in_at}
                  tournamentStatus={tournament.status}
                />
              )}
              <Link href={`/tournaments/${id}/bracket`}>
                <Button variant={isParticipant && tournament.status === 'in_progress' ? 'default' : 'outline'}>
                  {isParticipant && tournament.status === 'in_progress' ? t('tournament.detail.bracketAndReport') : t('tournament.detail.bracket')}
                </Button>
              </Link>
            </>
          )}
          {isOrganizer && (
            <Link href={`/tournaments/${id}/manage`}>
              <Button variant="secondary">{t('tournament.detail.manageButton')}</Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
