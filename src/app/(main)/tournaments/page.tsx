import { createClient } from '@/lib/supabase/server'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { TournamentWithOrganizer } from '@/types/tournament'

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''

  const supabase = await createClient()

  // Fetch tournaments with organizer profile
  let tournamentsQuery = supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `
    )
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })

  // Apply search filter if query exists
  if (query) {
    tournamentsQuery = tournamentsQuery.ilike('title', `%${query}%`)
  }

  const { data: tournaments, error: tournamentsError } =
    await tournamentsQuery

  if (tournamentsError) {
    console.error('Error fetching tournaments:', tournamentsError)
  }

  // Fetch participant counts for each tournament
  const tournamentIds = tournaments?.map((t) => t.id) || []
  const { data: participantCounts } = await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', tournamentIds)

  // Count participants per tournament
  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">大会一覧</h1>
        {user && (
          <Link href="/tournaments/new">
            <Button>大会を作成</Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <form action="/tournaments" method="get" className="mb-6">
        <div className="flex gap-4">
          <Input
            name="q"
            placeholder="大会を検索..."
            defaultValue={query}
            className="max-w-sm"
          />
          <Button type="submit">検索</Button>
        </div>
      </form>

      {/* Tournament Grid */}
      {tournaments && tournaments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament as TournamentWithOrganizer}
              participantCount={countMap.get(tournament.id) || 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {query
              ? '検索結果が見つかりませんでした'
              : 'まだ大会がありません'}
          </p>
        </div>
      )}
    </div>
  )
}
