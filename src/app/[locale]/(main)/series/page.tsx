import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { SeriesWithOrganizer } from '@/types/series'
import type { PostgrestError } from '@supabase/supabase-js'
import { SeriesListItem, SeriesListSection } from '@/components/series/SeriesListItem'
import { SeriesFilterForm } from '@/components/series/SeriesFilterForm'
import { getTranslations } from 'next-intl/server'

type FilterStatus = 'all' | 'active' | 'completed'

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: FilterStatus }>
}) {
  const t = await getTranslations('series')
  const params = await searchParams
  const query = params.q || ''
  const statusFilter = params.status || 'all'

  const supabase = await createClient()

  // Fetch series with organizer profile
  let seriesQuery = supabase
    .from('series')
    .select(
      `
      *,
      organizer:profiles!series_organizer_id_fkey(*)
    `
    )
    .order('created_at', { ascending: false })

  // Apply search filter if query exists
  if (query) {
    seriesQuery = seriesQuery.ilike('name', `%${query}%`)
  }

  // Apply status filter - exclude draft/cancelled from public list
  if (statusFilter !== 'all') {
    seriesQuery = seriesQuery.eq('status', statusFilter)
  } else {
    // Show only active and completed for "all"
    seriesQuery = seriesQuery.in('status', ['active', 'completed'])
  }

  const { data: seriesList, error: seriesError } =
    (await seriesQuery) as { data: SeriesWithOrganizer[] | null; error: PostgrestError | null }

  if (seriesError) {
    console.error('Error fetching series:', seriesError)
  }

  // Fetch tournament counts for each series
  const seriesIds = seriesList?.map((s) => s.id) || []
  const { data: tournamentCounts } = (await supabase
    .from('tournaments')
    .select('series_id')
    .in('series_id', seriesIds)) as { data: { series_id: string }[] | null }

  // Count tournaments per series
  const countMap = new Map<string, number>()
  tournamentCounts?.forEach((t) => {
    if (t.series_id) {
      countMap.set(t.series_id, (countMap.get(t.series_id) || 0) + 1)
    }
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Group series by status when showing all
  const groupByStatus = (list: SeriesWithOrganizer[]) => {
    const groups: Record<string, SeriesWithOrganizer[]> = {
      active: [],
      completed: [],
    }
    list.forEach((s) => {
      if (s.status === 'active') groups.active.push(s)
      else if (s.status === 'completed') groups.completed.push(s)
    })
    return groups
  }

  const grouped = seriesList ? groupByStatus(seriesList) : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {user && (
          <Link href="/series/new">
            <Button>{t('create')}</Button>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <SeriesFilterForm />
      </div>

      {/* Series List */}
      {seriesList && seriesList.length > 0 ? (
        <Card>
          <CardContent className="p-2">
            {statusFilter === 'all' && grouped ? (
              // Grouped view when showing all
              <div className="space-y-4">
                {grouped.active.length > 0 && (
                  <SeriesListSection
                    title={t('status.active')}
                    count={grouped.active.length}
                  >
                    {grouped.active.map((series) => (
                      <SeriesListItem
                        key={series.id}
                        series={series}
                        tournamentCount={countMap.get(series.id) || 0}
                        showOrganizer
                      />
                    ))}
                  </SeriesListSection>
                )}

                {grouped.completed.length > 0 && (
                  <SeriesListSection
                    title={t('status.completed')}
                    count={grouped.completed.length}
                  >
                    {grouped.completed.map((series) => (
                      <SeriesListItem
                        key={series.id}
                        series={series}
                        tournamentCount={countMap.get(series.id) || 0}
                        showOrganizer
                      />
                    ))}
                  </SeriesListSection>
                )}
              </div>
            ) : (
              // Flat list when filtered
              <div className="divide-y">
                {seriesList.map((series) => (
                  <SeriesListItem
                    key={series.id}
                    series={series}
                    tournamentCount={countMap.get(series.id) || 0}
                    showOrganizer
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {query
                ? t('searchEmpty')
                : t('empty')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
