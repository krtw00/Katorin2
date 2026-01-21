'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TeamListItem } from '@/components/team/TeamListItem'
import { TeamWithLeader } from '@/types/team'

type TeamWithCount = TeamWithLeader & { member_count: number }

export default function TeamsPage() {
  const t = useTranslations('team.list')
  const tCommon = useTranslations('common')
  const supabase = createClient()
  const [teams, setTeams] = useState<TeamWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [supabase])

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true)

      let query = supabase
        .from('teams')
        .select(`
          *,
          leader:profiles!teams_leader_id_fkey(*),
          team_members(count)
        `)
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (!error && data) {
        type TeamRow = TeamWithLeader & { team_members?: { count: number }[] }
        const teamsWithCount = data.map((team: TeamRow) => ({
          ...team,
          member_count: team.team_members?.[0]?.count || 0,
        }))
        setTeams(teamsWithCount)
      }

      setLoading(false)
    }

    const debounce = setTimeout(fetchTeams, 300)
    return () => clearTimeout(debounce)
  }, [supabase, searchQuery])

  // 自分のチームとその他を分ける
  const myTeams = teams.filter(team =>
    user && (team.leader_id === user.id)
  )
  const otherTeams = teams.filter(team =>
    !user || team.leader_id !== user.id
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/teams/new">
          <Button>{t('create')}</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </div>
      )}

      {/* Teams */}
      {!loading && (
        <div className="space-y-8">
          {/* My Teams */}
          {myTeams.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t('myTeams')}</h2>
              <div className="grid gap-3">
                {myTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

          {/* Other Teams */}
          {otherTeams.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {myTeams.length > 0 ? t('otherTeams') : t('allTeams')}
              </h2>
              <div className="grid gap-3">
                {otherTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {teams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t('noResults') : t('empty')}
              </p>
              {!searchQuery && (
                <Link href="/teams/new">
                  <Button>{t('createFirst')}</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
