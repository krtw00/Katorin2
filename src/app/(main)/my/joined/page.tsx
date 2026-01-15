import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TournamentWithOrganizer, TournamentStatus } from '@/types/tournament'
import {
  TournamentListItem,
  TournamentListSection,
} from '@/components/tournament/TournamentListItem'

type ParticipationWithTournament = {
  final_placement: number | null
  tournament: TournamentWithOrganizer
}

export default async function JoinedTournamentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get tournaments user is participating in
  const { data: participations } = await supabase
    .from('participants')
    .select(
      `
      final_placement,
      tournament:tournaments(
        *,
        organizer:profiles!tournaments_organizer_id_fkey(*)
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const participationsData: ParticipationWithTournament[] =
    (participations?.filter((p: any) => p.tournament) as ParticipationWithTournament[]) || []

  // Get participant counts for all tournaments
  const tournamentIds = participationsData.map((p) => p.tournament.id)

  const countMap = new Map<string, number>()

  // Only query if there are tournaments (avoid .in([]) error)
  if (tournamentIds.length > 0) {
    const { data: participantCounts } = (await supabase
      .from('participants')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)) as {
      data: { tournament_id: string }[] | null
    }

    participantCounts?.forEach((p) => {
      countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
    })
  }

  // Create placement map
  const placementMap = new Map<string, number | null>()
  participationsData.forEach((p) => {
    placementMap.set(p.tournament.id, p.final_placement)
  })

  // Group tournaments by status
  const groupByStatus = (list: ParticipationWithTournament[]) => {
    const groups: Record<TournamentStatus, ParticipationWithTournament[]> = {
      draft: [],
      published: [],
      recruiting: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    }
    list.forEach((p) => {
      groups[p.tournament.status].push(p)
    })
    return groups
  }

  const grouped = groupByStatus(participationsData)

  // Active = recruiting + in_progress
  const active = [...grouped.recruiting, ...grouped.in_progress]

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/my" className="text-muted-foreground hover:text-foreground">
            ← マイページ
          </Link>
          <h1 className="text-2xl font-bold">参加大会</h1>
        </div>
        <Link href="/tournaments">
          <Button variant="outline">大会を探す</Button>
        </Link>
      </div>

      {/* Tournament List */}
      <Card>
        <CardContent className="p-2">
          {participationsData.length > 0 ? (
            <div className="space-y-4">
              {/* Published tournaments (before entry period) */}
              {grouped.published.length > 0 && (
                <TournamentListSection
                  title="受付待ち"
                  count={grouped.published.length}
                >
                  {grouped.published.map((p) => (
                    <TournamentListItem
                      key={p.tournament.id}
                      tournament={p.tournament}
                      participantCount={countMap.get(p.tournament.id) || 0}
                      showOrganizer
                      placement={p.final_placement}
                    />
                  ))}
                </TournamentListSection>
              )}

              {/* Active tournaments */}
              {active.length > 0 && (
                <TournamentListSection
                  title="開催中・募集中"
                  count={active.length}
                >
                  {active.map((p) => (
                    <TournamentListItem
                      key={p.tournament.id}
                      tournament={p.tournament}
                      participantCount={countMap.get(p.tournament.id) || 0}
                      showOrganizer
                      placement={p.final_placement}
                    />
                  ))}
                </TournamentListSection>
              )}

              {/* Completed tournaments */}
              {grouped.completed.length > 0 && (
                <TournamentListSection
                  title="終了"
                  count={grouped.completed.length}
                >
                  {grouped.completed.map((p) => (
                    <TournamentListItem
                      key={p.tournament.id}
                      tournament={p.tournament}
                      participantCount={countMap.get(p.tournament.id) || 0}
                      showOrganizer
                      placement={p.final_placement}
                    />
                  ))}
                </TournamentListSection>
              )}

              {/* Cancelled tournaments */}
              {grouped.cancelled.length > 0 && (
                <TournamentListSection
                  title="キャンセル"
                  count={grouped.cancelled.length}
                >
                  {grouped.cancelled.map((p) => (
                    <TournamentListItem
                      key={p.tournament.id}
                      tournament={p.tournament}
                      participantCount={countMap.get(p.tournament.id) || 0}
                      showOrganizer
                      placement={p.final_placement}
                    />
                  ))}
                </TournamentListSection>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                参加している大会がありません
              </p>
              <Link href="/tournaments">
                <Button>大会を探す</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
