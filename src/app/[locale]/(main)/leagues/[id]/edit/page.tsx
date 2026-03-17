'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LeagueForm } from '@/components/league/LeagueForm'
import { Series } from '@/types/league'
import { useTranslations } from 'next-intl'

type Props = {
  params: Promise<{ id: string }>
}

export default function EditLeaguePage({ params }: Props) {
  const t = useTranslations('leagues')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const supabase = createClient()
  const [league, setLeague] = useState<Series | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLeague = async () => {
      const { id } = await params

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', id)
        .single()

      if (leagueError || !leagueData) {
        setError(t('notFound'))
        setLoading(false)
        return
      }

      if (user.id !== leagueData.organizer_id) {
        setError(t('noPermission'))
        setLoading(false)
        return
      }

      setLeague(leagueData as Series)
      setLoading(false)
    }

    loadLeague()
  }, [params, router, supabase, t])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!league) {
    return null
  }

  return <LeagueForm mode="edit" initialData={league} />
}
