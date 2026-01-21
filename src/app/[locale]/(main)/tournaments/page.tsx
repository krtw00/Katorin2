import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { TournamentWithOrganizer } from '@/types/tournament'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  TournamentListItem,
  TournamentListSection,
} from '@/components/tournament/TournamentListItem'
import { getTranslations } from 'next-intl/server'

type FilterStatus = 'all' | 'recruiting' | 'in_progress' | 'completed'

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: FilterStatus
    start_from?: string
    start_to?: string
  }>
}) {
  const t = await getTranslations('tournament.list')
  const params = await searchParams
  const query = params.q || ''
  const statusFilter = params.status || 'all'
  const startFrom = params.start_from || ''
  const startTo = params.start_to || ''

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: t('filter.all') },
    { value: 'recruiting', label: t('filter.recruiting') },
    { value: 'in_progress', label: t('filter.in_progress') },
    { value: 'completed', label: t('filter.completed') },
  ]

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

  // Apply status filter - exclude completed/cancelled/draft from public list
  if (statusFilter !== 'all') {
    tournamentsQuery = tournamentsQuery.eq('status', statusFilter)
  } else {
    // Show only recruiting and in_progress for "all"
    tournamentsQuery = tournamentsQuery.in('status', ['recruiting', 'in_progress'])
  }

  // Apply date range filter
  if (startFrom) {
    tournamentsQuery = tournamentsQuery.gte('start_at', startFrom)
  }
  if (startTo) {
    tournamentsQuery = tournamentsQuery.lte('start_at', startTo)
  }

  const { data: tournaments, error: tournamentsError } =
    (await tournamentsQuery) as { data: TournamentWithOrganizer[] | null; error: PostgrestError | null }

  if (tournamentsError) {
    console.error('Error fetching tournaments:', tournamentsError)
  }

  // Fetch participant counts for each tournament
  const tournamentIds = tournaments?.map((t) => t.id) || []
  const { data: participantCounts } = (await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', tournamentIds)) as { data: { tournament_id: string }[] | null }

  // Count participants per tournament
  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Group tournaments by status when showing all
  const groupByStatus = (list: TournamentWithOrganizer[]) => {
    const groups: Record<string, TournamentWithOrganizer[]> = {
      recruiting: [],
      in_progress: [],
      completed: [],
    }
    list.forEach((t) => {
      if (t.status === 'recruiting') groups.recruiting.push(t)
      else if (t.status === 'in_progress') groups.in_progress.push(t)
      else if (t.status === 'completed') groups.completed.push(t)
    })
    return groups
  }

  const grouped = tournaments ? groupByStatus(tournaments) : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {user && (
          <Link href="/tournaments/new">
            <Button>{t('create')}</Button>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <form action="/tournaments" method="get" className="flex flex-wrap gap-2">
          <Input
            name="q"
            placeholder={t('search')}
            defaultValue={query}
            className="max-w-sm"
          />
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              name="start_from"
              defaultValue={startFrom}
              className="max-w-[150px]"
              placeholder={t('startFrom')}
            />
            <span className="text-muted-foreground">〜</span>
            <Input
              type="date"
              name="start_to"
              defaultValue={startTo}
              className="max-w-[150px]"
              placeholder={t('startTo')}
            />
          </div>
          {statusFilter !== 'all' && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <Button type="submit" variant="secondary">
            {t('searchButton')}
          </Button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((option) => (
            <Link
              key={option.value}
              href={`/tournaments?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(option.value !== 'all' ? { status: option.value } : {}),
                ...(startFrom ? { start_from: startFrom } : {}),
                ...(startTo ? { start_to: startTo } : {}),
              }).toString()}`}
            >
              <Badge
                variant={statusFilter === option.value ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 px-3 py-1"
              >
                {option.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Tournament List */}
      {tournaments && tournaments.length > 0 ? (
        <Card>
          <CardContent className="p-2">
            {statusFilter === 'all' && grouped ? (
              // Grouped view when showing all
              <div className="space-y-4">
                {grouped.recruiting.length > 0 && (
                  <TournamentListSection
                    title={t('filter.recruiting')}
                    count={grouped.recruiting.length}
                  >
                    {grouped.recruiting.map((tournament) => (
                      <TournamentListItem
                        key={tournament.id}
                        tournament={tournament}
                        participantCount={countMap.get(tournament.id) || 0}
                        showOrganizer
                      />
                    ))}
                  </TournamentListSection>
                )}

                {grouped.in_progress.length > 0 && (
                  <TournamentListSection
                    title={t('filter.in_progress')}
                    count={grouped.in_progress.length}
                  >
                    {grouped.in_progress.map((tournament) => (
                      <TournamentListItem
                        key={tournament.id}
                        tournament={tournament}
                        participantCount={countMap.get(tournament.id) || 0}
                        showOrganizer
                      />
                    ))}
                  </TournamentListSection>
                )}

                {grouped.completed.length > 0 && (
                  <TournamentListSection
                    title={t('filter.completed')}
                    count={grouped.completed.length}
                  >
                    {grouped.completed.map((tournament) => (
                      <TournamentListItem
                        key={tournament.id}
                        tournament={tournament}
                        participantCount={countMap.get(tournament.id) || 0}
                        showOrganizer
                      />
                    ))}
                  </TournamentListSection>
                )}
              </div>
            ) : (
              // Flat list when filtered
              <div className="divide-y">
                {tournaments.map((tournament) => (
                  <TournamentListItem
                    key={tournament.id}
                    tournament={tournament}
                    participantCount={countMap.get(tournament.id) || 0}
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
              {query ? t('noResults') : t('empty')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
