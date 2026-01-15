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

export default async function HostedTournamentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get tournaments organized by user
  const { data: tournaments } = (await supabase
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

  // Get participant counts for all tournaments
  const tournamentIds = tournaments?.map((t) => t.id) || []

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

  // Group tournaments by status
  const groupByStatus = (list: TournamentWithOrganizer[]) => {
    const groups: Record<TournamentStatus, TournamentWithOrganizer[]> = {
      draft: [],
      published: [],
      recruiting: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    }
    list.forEach((t) => {
      groups[t.status].push(t)
    })
    return groups
  }

  const grouped = groupByStatus(tournaments || [])

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
          <h1 className="text-2xl font-bold">主催大会</h1>
        </div>
        <Link href="/tournaments/new">
          <Button>大会を作成</Button>
        </Link>
      </div>

      {/* Tournament List */}
      <Card>
        <CardContent className="p-2">
          {tournaments && tournaments.length > 0 ? (
            <div className="space-y-4">
              {/* Draft tournaments */}
              {grouped.draft.length > 0 && (
                <TournamentListSection
                  title="下書き"
                  count={grouped.draft.length}
                >
                  {grouped.draft.map((tournament) => (
                    <TournamentListItem
                      key={tournament.id}
                      tournament={tournament}
                      participantCount={countMap.get(tournament.id) || 0}
                      showManageLink
                    />
                  ))}
                </TournamentListSection>
              )}

              {/* Published tournaments (before entry period) */}
              {grouped.published.length > 0 && (
                <TournamentListSection
                  title="公開（受付前）"
                  count={grouped.published.length}
                >
                  {grouped.published.map((tournament) => (
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
              {active.length > 0 && (
                <TournamentListSection
                  title="開催中・募集中"
                  count={active.length}
                >
                  {active.map((tournament) => (
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
              {grouped.completed.length > 0 && (
                <TournamentListSection
                  title="終了"
                  count={grouped.completed.length}
                >
                  {grouped.completed.map((tournament) => (
                    <TournamentListItem
                      key={tournament.id}
                      tournament={tournament}
                      participantCount={countMap.get(tournament.id) || 0}
                      showManageLink
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
                  {grouped.cancelled.map((tournament) => (
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
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                主催している大会がありません
              </p>
              <Link href="/tournaments/new">
                <Button>最初の大会を作成</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
