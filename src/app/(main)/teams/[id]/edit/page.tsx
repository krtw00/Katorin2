'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TeamForm } from '@/components/team/TeamForm'
import { Team } from '@/types/team'

export default function EditTeamPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTeam = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', params.id)
        .single()

      if (teamError || !teamData) {
        setError('チームが見つかりません')
        setLoading(false)
        return
      }

      // 権限チェック
      if (teamData.leader_id !== user.id) {
        setError('編集権限がありません')
        setLoading(false)
        return
      }

      setTeam(teamData)
      setLoading(false)
    }

    fetchTeam()
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
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

  if (!team) {
    return notFound()
  }

  return <TeamForm mode="edit" initialData={team} />
}
