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
import { TournamentRanking } from '@/components/tournament/TournamentRanking'
import { MatchWithPlayers, ParticipantWithUser } from '@/types/tournament'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentRankingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // Fetch participants with user details
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('tournament_id', id)
    .order('seed', { ascending: true })

  if (participantsError) {
    console.error('Error fetching participants:', participantsError)
  }

  // Fetch matches with player details
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      player1:profiles!matches_player1_id_fkey(*),
      player2:profiles!matches_player2_id_fkey(*),
      winner:profiles!matches_winner_id_fkey(*)
    `)
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  if (matchesError) {
    console.error('Error fetching matches:', matchesError)
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
              <CardTitle>ランキング</CardTitle>
              <CardDescription>{tournament.title}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href={`/tournaments/${id}/bracket`}>
                <Button variant="outline" size="sm">
                  トーナメント表
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TournamentRanking
            participants={(participants as ParticipantWithUser[]) || []}
            matches={(matches as MatchWithPlayers[]) || []}
            tournamentStatus={tournament.status}
          />
        </CardContent>
      </Card>
    </div>
  )
}
