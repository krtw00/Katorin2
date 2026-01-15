/**
 * 大会編集ページ - 主催者のみが編集可能
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TournamentForm } from '@/components/tournament/TournamentForm'
import { Tournament } from '@/types/tournament'

type Props = {
  params: Promise<{ id: string }>
}

export default function EditTournamentPage({ params }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadTournament = async () => {
      const { id } = await params

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (tournamentError || !tournamentData) {
        setError('大会が見つかりませんでした')
        setLoading(false)
        return
      }

      // Check if user is the organizer
      if (user.id !== tournamentData.organizer_id) {
        setError('編集権限がありません')
        setLoading(false)
        return
      }

      setTournament(tournamentData)
      setLoading(false)
    }

    loadTournament()
  }, [params, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return null
  }

  return <TournamentForm mode="edit" initialData={tournament} />
}
