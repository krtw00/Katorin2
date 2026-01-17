'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SeriesForm } from '@/components/series/SeriesForm'
import { Series, PointConfig } from '@/types/series'

type Props = {
  params: Promise<{ id: string }>
}

export default function EditSeriesPage({ params }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [series, setSeries] = useState<Series | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSeries = async () => {
      const { id } = await params

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch series
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select('*')
        .eq('id', id)
        .single()

      if (seriesError || !seriesData) {
        setError('シリーズが見つかりませんでした')
        setLoading(false)
        return
      }

      // Check if user is organizer
      if (user.id !== seriesData.organizer_id) {
        setError('編集権限がありません')
        setLoading(false)
        return
      }

      setSeries({
        ...seriesData,
        point_config: seriesData.point_config as PointConfig,
      })
      setLoading(false)
    }

    loadSeries()
  }, [params, router, supabase])

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
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!series) {
    return null
  }

  return <SeriesForm mode="edit" initialData={series} />
}
