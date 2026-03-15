export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { OrderSubmitForm } from '@/components/tournament/OrderSubmitForm'

type Props = {
  params: Promise<{ id: string; matchId: string }>
}

export default async function OrderPage({ params }: Props) {
  const { id, matchId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 大会情報
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()
  if (!tournament) notFound()

  // match情報
  const { data: match } = await supabase
    .from('matches')
    .select('*, team1:teams!matches_team1_id_fkey(id, name), team2:teams!matches_team2_id_fkey(id, name)')
    .eq('id', matchId)
    .single()
  if (!match) notFound()

  // ユーザーがどちらのチームに属するか確認
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .in('team_id', [match.team1_id, match.team2_id].filter(Boolean) as string[])
    .single()

  if (!membership) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-destructive">このWarのチームメンバーではありません</p>
      </div>
    )
  }

  const isOrganizer = user.id === tournament.organizer_id
  const isLeader = membership.role === 'leader'

  if (!isLeader && !isOrganizer) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-destructive">オーダー提出はチームリーダーのみ可能です</p>
      </div>
    )
  }

  // チームメンバー一覧
  const { data: members } = await supabase
    .from('team_members')
    .select('*, user:profiles(*)')
    .eq('team_id', membership.team_id)

  // 既存オーダー
  const { data: existingOrders } = await supabase
    .from('war_orders')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_id', membership.team_id)
    .order('slot')

  const team1 = (Array.isArray(match.team1) ? match.team1[0] : match.team1) as { id: string; name: string } | null
  const team2 = (Array.isArray(match.team2) ? match.team2[0] : match.team2) as { id: string; name: string } | null
  const myTeamName = membership.team_id === match.team1_id ? team1?.name : team2?.name

  return (
    <OrderSubmitForm
      matchId={matchId}
      tournamentId={id}
      teamId={membership.team_id}
      teamName={myTeamName || 'My Team'}
      orderSize={tournament.order_size}
      subCount={tournament.sub_count}
      members={(members || []).map(m => ({
        userId: m.user_id,
        displayName: (m.user as { display_name: string } | null)?.display_name || '',
      }))}
      existingOrders={(existingOrders || []).map(o => ({
        slot: o.slot,
        userId: o.user_id,
        deckName: o.deck_name,
        deckTheme: o.deck_theme,
        isSub: o.is_sub,
      }))}
    />
  )
}
