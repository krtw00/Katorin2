'use client'

import { useSearchParams } from 'next/navigation'
import { TournamentForm } from '@/components/tournament/TournamentForm'

export default function NewTournamentPage() {
  const searchParams = useSearchParams()
  const seriesId = searchParams.get('series_id') || undefined

  return <TournamentForm mode="create" defaultSeriesId={seriesId} />
}
