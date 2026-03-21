import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { OrderSubmitForm } from '@/components/tournament/OrderSubmitForm'
import { AdminOrderForm } from '@/components/tournament/AdminOrderForm'
import { canOperateLeague, getRoundOrganizerRole } from '@/lib/league-organizer-permissions'
import type { Tables } from '@/types/database'

type Props = {
  params: Promise<{ id: string; matchId: string }>
}

type Profile = Tables<'profiles'>
type TeamMemberRow = Tables<'team_members'> & {
  user: Profile | Profile[] | null
}
type WarOrderRow = Tables<'war_orders'>

async function getTeamMembers(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string) {
  const { data: members } = await supabase
    .from('team_members')
    .select('*, user:profiles(*)')
    .eq('team_id', teamId)
  return ((members || []) as TeamMemberRow[]).map((member) => {
    const user = Array.isArray(member.user) ? member.user[0] : member.user
    return {
      userId: member.user_id,
      displayName: user?.display_name || '',
    }
  })
}

async function getExistingOrders(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string, teamId: string) {
  const { data: orders } = await supabase
    .from('war_orders')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_id', teamId)
    .order('slot')
  return ((orders || []) as WarOrderRow[]).map((order) => ({
    slot: order.slot,
    userId: order.user_id,
    deckName: order.deck_name,
    deckTheme: order.deck_theme,
    isSub: order.is_sub,
  }))
}

export default async function OrderPage({ params }: Props) {
  const { id, matchId } = await params
  const supabase = await createClient()

  // user, tournament, match を並列取得
  const [{ data: { user } }, { data: tournament }, { data: match }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('rounds')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('matches')
      .select('*, team1:teams!matches_team1_id_fkey(id, name), team2:teams!matches_team2_id_fkey(id, name)')
      .eq('id', matchId)
      .single(),
  ])
  if (!user) redirect('/login')
  if (!tournament) notFound()
  if (!match) notFound()

  const organizerRole = await getRoundOrganizerRole(supabase, id, user.id)
  const isOrganizer = canOperateLeague(organizerRole)
  const team1 = (Array.isArray(match.team1) ? match.team1[0] : match.team1) as { id: string; name: string } | null
  const team2 = (Array.isArray(match.team2) ? match.team2[0] : match.team2) as { id: string; name: string } | null

  // 管理者: 両チーム分のオーダーを入力
  if (isOrganizer && match.team1_id && match.team2_id) {
    const [team1Members, team2Members, team1Orders, team2Orders] = await Promise.all([
      getTeamMembers(supabase, match.team1_id),
      getTeamMembers(supabase, match.team2_id),
      getExistingOrders(supabase, matchId, match.team1_id),
      getExistingOrders(supabase, matchId, match.team2_id),
    ])

    return (
      <AdminOrderForm
        matchId={matchId}
        tournamentId={id}
        orderSize={tournament.order_size}
        subCount={tournament.sub_count}
        team1={{
          teamId: match.team1_id,
          teamName: team1?.name || 'Team 1',
          members: team1Members,
          existingOrders: team1Orders,
        }}
        team2={{
          teamId: match.team2_id,
          teamName: team2?.name || 'Team 2',
          members: team2Members,
          existingOrders: team2Orders,
        }}
      />
    )
  }

  // チームリーダー: 自チーム分のみ
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

  if (membership.role !== 'leader') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-destructive">オーダー提出はチームリーダーのみ可能です</p>
      </div>
    )
  }

  const members = await getTeamMembers(supabase, membership.team_id)
  const existingOrders = await getExistingOrders(supabase, matchId, membership.team_id)
  const myTeamName = membership.team_id === match.team1_id ? team1?.name : team2?.name

  return (
    <OrderSubmitForm
      matchId={matchId}
      tournamentId={id}
      teamId={membership.team_id}
      teamName={myTeamName || 'My Team'}
      orderSize={tournament.order_size}
      subCount={tournament.sub_count}
      members={members}
      existingOrders={existingOrders}
    />
  )
}
