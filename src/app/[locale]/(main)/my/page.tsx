import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { TournamentWithOrganizer, Profile, TournamentStatus } from '@/types/tournament'
import { ActionCard, NoActionsCard, ActionType } from '@/components/tournament/ActionCard'
import {
  TournamentListItem,
  TournamentListSection,
} from '@/components/tournament/TournamentListItem'
import { getTranslations } from 'next-intl/server'

type ActionItem = {
  type: ActionType
  tournamentId: string
  tournamentTitle: string
  description: string
  actionLabel: string
  actionHref: string
}

export default async function MyPage() {
  const t = await getTranslations('mypage')
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get profile
  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: Profile | null }

  // Get tournaments organized by user
  const { data: organizedTournaments } = (await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `
    )
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })) as {
    data: TournamentWithOrganizer[] | null
  }

  // Get tournaments user is participating in
  const { data: participations } = await supabase
    .from('participants')
    .select(
      `
      *,
      tournament:tournaments(
        *,
        organizer:profiles!tournaments_organizer_id_fkey(*)
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const participatingTournaments: TournamentWithOrganizer[] =
    participations?.map((p: { tournament: TournamentWithOrganizer }) => p.tournament).filter(Boolean) || []

  // Get participant counts for all tournaments
  const allTournamentIds = [
    ...(organizedTournaments?.map((t) => t.id) || []),
    ...participatingTournaments.map((t) => t.id),
  ]

  const { data: participantCounts } = (await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', allTournamentIds)) as {
    data: { tournament_id: string }[] | null
  }

  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  // Get user's team IDs (for team matches)
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('team_id, team:teams(id, name)')
    .eq('user_id', user.id)

  const userTeamIds = teamMemberships?.map((tm: { team_id: string }) => tm.team_id) || []
  const teamNameMap = new Map<string, string>()
  teamMemberships?.forEach((tm: { team_id: string; team: { id: string; name: string } | null }) => {
    if (tm.team) teamNameMap.set(tm.team.id, tm.team.name)
  })

  // Get in_progress matches (individual: user is player1/player2)
  const [{ data: individualInProgress }, { data: teamInProgress }, { data: individualPendingReport }, { data: teamPendingReport }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, match_number, round, tournament_id, player1_id, player2_id, status, tournament:tournaments(id, title), player1:profiles!matches_player1_id_fkey(display_name), player2:profiles!matches_player2_id_fkey(display_name)')
      .eq('status', 'in_progress')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`),
    // Get in_progress matches (team: user's team is team1/team2)
    userTeamIds.length > 0
      ? supabase
          .from('matches')
          .select('id, match_number, round, tournament_id, team1_id, team2_id, status, tournament:tournaments(id, title), team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
          .eq('status', 'in_progress')
          .or(userTeamIds.map(id => `team1_id.eq.${id},team2_id.eq.${id}`).join(','))
      : Promise.resolve({ data: null }),
    // Get completed matches with pending result report (individual)
    supabase
      .from('matches')
      .select('id, match_number, round, tournament_id, player1_id, player2_id, status, winner_id, report_status, tournament:tournaments(id, title), player1:profiles!matches_player1_id_fkey(display_name), player2:profiles!matches_player2_id_fkey(display_name)')
      .eq('status', 'completed')
      .is('winner_id', null)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`),
    // Get completed matches with pending result report (team)
    userTeamIds.length > 0
      ? supabase
          .from('matches')
          .select('id, match_number, round, tournament_id, team1_id, team2_id, status, winner_team_id, report_status, tournament:tournaments(id, title), team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
          .eq('status', 'completed')
          .is('winner_team_id', null)
          .or(userTeamIds.map(id => `team1_id.eq.${id},team2_id.eq.${id}`).join(','))
      : Promise.resolve({ data: null }),
  ])

  // Build action items
  const actions: ActionItem[] = []

  // Add next_match actions (individual)
  individualInProgress?.forEach((match) => {
    const tournament = match.tournament as { id: string; title: string } | null
    if (!tournament) return
    const isPlayer1 = match.player1_id === user.id
    const opponent = isPlayer1
      ? (match.player2 as { display_name: string } | null)?.display_name ?? '?'
      : (match.player1 as { display_name: string } | null)?.display_name ?? '?'
    actions.push({
      type: 'next_match',
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      description: t('actions.nextMatch', { opponent }),
      actionLabel: t('actions.goToMatch'),
      actionHref: `/tournaments/${tournament.id}`,
    })
  })

  // Add next_match actions (team)
  teamInProgress?.forEach((match) => {
    const tournament = match.tournament as { id: string; title: string } | null
    if (!tournament) return
    const isTeam1 = userTeamIds.includes(match.team1_id!)
    const opponent = isTeam1
      ? (match.team2 as { name: string } | null)?.name ?? '?'
      : (match.team1 as { name: string } | null)?.name ?? '?'
    actions.push({
      type: 'next_match',
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      description: t('actions.nextMatch', { opponent }),
      actionLabel: t('actions.goToMatch'),
      actionHref: `/tournaments/${tournament.id}`,
    })
  })

  // Add result_pending actions (individual)
  individualPendingReport?.forEach((match) => {
    const tournament = match.tournament as { id: string; title: string } | null
    if (!tournament) return
    actions.push({
      type: 'result_pending',
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      description: t('actions.resultPending'),
      actionLabel: t('actions.reportResult'),
      actionHref: `/tournaments/${tournament.id}`,
    })
  })

  // Add result_pending actions (team)
  teamPendingReport?.forEach((match) => {
    const tournament = match.tournament as { id: string; title: string } | null
    if (!tournament) return
    actions.push({
      type: 'result_pending',
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      description: t('actions.resultPending'),
      actionLabel: t('actions.reportResult'),
      actionHref: `/tournaments/${tournament.id}`,
    })
  })

  // Check for tournaments that need bracket generation (organizer)
  organizedTournaments?.forEach((tournament) => {
    if (tournament.status === 'recruiting') {
      const count = countMap.get(tournament.id) || 0
      if (count >= 2) {
        actions.push({
          type: 'bracket_ready',
          tournamentId: tournament.id,
          tournamentTitle: tournament.title,
          description: t('actions.bracketReady', { count }),
          actionLabel: t('actions.goToManage'),
          actionHref: `/tournaments/${tournament.id}/manage`,
        })
      } else {
        actions.push({
          type: 'entry_open',
          tournamentId: tournament.id,
          tournamentTitle: tournament.title,
          description: t('actions.entryOpen', { count, max: tournament.max_participants }),
          actionLabel: t('actions.viewDetails'),
          actionHref: `/tournaments/${tournament.id}`,
        })
      }
    }
  })

  // Group tournaments by status
  const groupByStatus = (tournaments: TournamentWithOrganizer[]) => {
    const groups: Record<TournamentStatus, TournamentWithOrganizer[]> = {
      draft: [],
      published: [],
      recruiting: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    }
    tournaments.forEach((tournament) => {
      groups[tournament.status].push(tournament)
    })
    return groups
  }

  const organizedByStatus = groupByStatus(organizedTournaments || [])
  const participatingByStatus = groupByStatus(participatingTournaments)

  // Active = recruiting + in_progress
  const activeOrganized = [
    ...organizedByStatus.recruiting,
    ...organizedByStatus.in_progress,
  ]
  const activeParticipating = [
    ...participatingByStatus.recruiting,
    ...participatingByStatus.in_progress,
  ]

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Profile Card - Compact */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {profile?.display_name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{profile?.display_name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {profile?.discord_id && (
                <p className="text-sm text-muted-foreground">Discord: {profile.discord_id}</p>
              )}
            </div>
            <Link href="/my/edit">
              <Button variant="outline" size="sm">
                {t('profile.edit')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Action Required Section */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          {t('actions.title')}
          {actions.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({actions.length})
            </span>
          )}
        </h2>
        {actions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {actions.map((action, i) => (
              <ActionCard key={i} {...action} />
            ))}
          </div>
        ) : (
          <NoActionsCard />
        )}
      </section>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/my/teams">
          <Button variant="outline" size="sm">
            {t('teams.link')}
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="participating" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="participating" className="gap-2">
            {t('tabs.participating')}
            <span className="text-xs text-muted-foreground">
              ({participatingTournaments.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="organizing" className="gap-2">
            {t('tabs.organizing')}
            <span className="text-xs text-muted-foreground">
              ({organizedTournaments?.length || 0})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Participating Tournaments */}
        <TabsContent value="participating">
          <Card>
            <CardContent className="p-2">
              {participatingTournaments.length > 0 ? (
                <div className="space-y-4">
                  {/* Active tournaments */}
                  {activeParticipating.length > 0 && (
                    <TournamentListSection
                      title={t('sections.active')}
                      count={activeParticipating.length}
                    >
                      {activeParticipating.map((tournament) => (
                        <TournamentListItem
                          key={tournament.id}
                          tournament={tournament}
                          participantCount={countMap.get(tournament.id) || 0}
                          showOrganizer
                        />
                      ))}
                    </TournamentListSection>
                  )}

                  {/* Completed tournaments */}
                  {participatingByStatus.completed.length > 0 && (
                    <TournamentListSection
                      title={t('sections.completed')}
                      count={participatingByStatus.completed.length}
                    >
                      {participatingByStatus.completed.map((tournament) => (
                        <TournamentListItem
                          key={tournament.id}
                          tournament={tournament}
                          participantCount={countMap.get(tournament.id) || 0}
                          showOrganizer
                        />
                      ))}
                    </TournamentListSection>
                  )}

                  {/* Link to full list */}
                  <div className="text-center py-2">
                    <Link
                      href="/my/joined"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {t('participating.viewAll')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {t('participating.empty')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organized Tournaments */}
        <TabsContent value="organizing">
          <Card>
            <CardContent className="p-2">
              {organizedTournaments && organizedTournaments.length > 0 ? (
                <div className="space-y-4">
                  {/* Draft tournaments */}
                  {organizedByStatus.draft.length > 0 && (
                    <TournamentListSection
                      title={t('sections.draft')}
                      count={organizedByStatus.draft.length}
                    >
                      {organizedByStatus.draft.map((tournament) => (
                        <TournamentListItem
                          key={tournament.id}
                          tournament={tournament}
                          participantCount={countMap.get(tournament.id) || 0}
                          showManageLink
                        />
                      ))}
                    </TournamentListSection>
                  )}

                  {/* Active tournaments */}
                  {activeOrganized.length > 0 && (
                    <TournamentListSection
                      title={t('sections.active')}
                      count={activeOrganized.length}
                    >
                      {activeOrganized.map((tournament) => (
                        <TournamentListItem
                          key={tournament.id}
                          tournament={tournament}
                          participantCount={countMap.get(tournament.id) || 0}
                          showManageLink
                        />
                      ))}
                    </TournamentListSection>
                  )}

                  {/* Completed tournaments */}
                  {organizedByStatus.completed.length > 0 && (
                    <TournamentListSection
                      title={t('sections.completed')}
                      count={organizedByStatus.completed.length}
                    >
                      {organizedByStatus.completed.map((tournament) => (
                        <TournamentListItem
                          key={tournament.id}
                          tournament={tournament}
                          participantCount={countMap.get(tournament.id) || 0}
                          showManageLink
                        />
                      ))}
                    </TournamentListSection>
                  )}

                  {/* Link to full list */}
                  <div className="text-center py-2">
                    <Link
                      href="/my/hosted"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {t('organizing.viewAll')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {t('organizing.empty')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
