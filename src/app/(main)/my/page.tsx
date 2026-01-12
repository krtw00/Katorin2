import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TournamentWithOrganizer, Profile, TournamentStatus } from '@/types/tournament'
import { ActionCard, NoActionsCard, ActionType } from '@/components/tournament/ActionCard'
import {
  TournamentListItem,
  TournamentListSection,
} from '@/components/tournament/TournamentListItem'

type ActionItem = {
  type: ActionType
  tournamentId: string
  tournamentTitle: string
  description: string
  actionLabel: string
  actionHref: string
}

export default async function MyPage() {
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
    participations?.map((p: any) => p.tournament).filter(Boolean) || []

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

  // Build action items
  const actions: ActionItem[] = []

  // Check for tournaments that need bracket generation (organizer)
  organizedTournaments?.forEach((t) => {
    if (t.status === 'recruiting') {
      const count = countMap.get(t.id) || 0
      if (count >= 2) {
        actions.push({
          type: 'bracket_ready',
          tournamentId: t.id,
          tournamentTitle: t.title,
          description: `${count}名参加中 - ブラケット生成可能`,
          actionLabel: '管理画面へ',
          actionHref: `/tournaments/${t.id}/manage`,
        })
      } else {
        actions.push({
          type: 'entry_open',
          tournamentId: t.id,
          tournamentTitle: t.title,
          description: `${count}/${t.max_participants}名 - エントリー受付中`,
          actionLabel: '詳細を見る',
          actionHref: `/tournaments/${t.id}`,
        })
      }
    }
  })

  // TODO: Add next_match and result_pending actions when match data is available

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
    tournaments.forEach((t) => {
      groups[t.status].push(t)
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
    <div className="container mx-auto px-4 py-8 space-y-6">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Required Section */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          対応が必要
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

      {/* Main Tabs */}
      <Tabs defaultValue="participating" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="participating" className="gap-2">
            参加中
            <span className="text-xs text-muted-foreground">
              ({participatingTournaments.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="organizing" className="gap-2">
            主催
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
                      title="開催中・募集中"
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
                      title="終了"
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
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    参加している大会がありません
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
                      title="下書き"
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
                      title="開催中・募集中"
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
                  {participatingByStatus.completed.length > 0 && (
                    <TournamentListSection
                      title="終了"
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
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    主催している大会がありません
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
