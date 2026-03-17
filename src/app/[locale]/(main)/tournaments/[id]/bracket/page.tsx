import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tournament } from '@/types/round'
import { RealtimeBracket } from '@/components/tournament/RealtimeBracket'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentBracketPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament, error: tournamentError } = (await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .single()) as { data: Tournament | null; error: unknown }

  if (tournamentError || !tournament) {
    notFound()
  }

  const isTeamBattle = tournament.entry_type === 'team'

  // Fetch matches with player/team details
  const selectFields = isTeamBattle
    ? `*,
       player1:profiles!matches_player1_id_fkey(*),
       player2:profiles!matches_player2_id_fkey(*),
       winner:profiles!matches_winner_id_fkey(*),
       team1:teams!matches_team1_id_fkey(id, name, avatar_url),
       team2:teams!matches_team2_id_fkey(id, name, avatar_url)`
    : `*,
       player1:profiles!matches_player1_id_fkey(*),
       player2:profiles!matches_player2_id_fkey(*),
       winner:profiles!matches_winner_id_fkey(*)`

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(selectFields)
    .eq('round_id', id)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  if (matchesError) {
    console.error('Error fetching matches:', matchesError)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.id === tournament.organizer_id

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/tournaments/${id}`}>
          <Button variant="ghost" size="sm">
            ← 大会詳細に戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>トーナメント表</CardTitle>
              <CardDescription>{tournament.title}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href={`/tournaments/${id}/ranking`}>
                <Button variant="outline" size="sm">
                  ランキング
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RealtimeBracket
            tournamentId={id}
            initialMatches={(matches || []) as never[]}
            isOrganizer={isOrganizer}
            currentUserId={user?.id ?? null}
            isTeamBattle={isTeamBattle}
          />
        </CardContent>
      </Card>
    </div>
  )
}
