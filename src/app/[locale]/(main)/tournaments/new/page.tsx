'use client'

import { useSearchParams } from 'next/navigation'
import { TournamentForm } from '@/components/tournament/TournamentForm'

export default function NewTournamentPage() {
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('league_id') || undefined

  return <TournamentForm mode="create" defaultLeagueId={leagueId} />
}
