'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { TeamListItem } from '@/components/team/TeamListItem'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { TeamWithLeader } from '@/types/team'

type TeamWithCount = TeamWithLeader & { member_count: number }

export default function TeamsPage() {
  const t = useTranslations('team.list')
  const tCommon = useTranslations('common')
  const supabase = createClient()
  const [leaderTeams, setLeaderTeams] = useState<TeamWithCount[]>([])
  const [memberTeams, setMemberTeams] = useState<TeamWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const fetchMyTeams = async () => {
      setLoading(true)

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      // リーダーとして所属するチーム
      const { data: leaderData } = await supabase
        .from('teams')
        .select(`
          *,
          leader:profiles!teams_leader_id_fkey(*),
          team_members(count)
        `)
        .eq('leader_id', currentUser.id)
        .order('created_at', { ascending: false })

      // メンバーとして所属するチーム（リーダー以外）
      const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', currentUser.id)
        .neq('role', 'leader')

      type TeamRow = TeamWithLeader & { team_members?: { count: number }[] }
      const toTeamWithCount = (team: TeamRow) => ({
        ...team,
        member_count: team.team_members?.[0]?.count || 0,
      })

      if (leaderData) {
        setLeaderTeams(leaderData.map(toTeamWithCount))
      }

      if (membershipData?.length) {
        const memberTeamIds = membershipData.map(m => m.team_id)
        const { data: memberTeamData } = await supabase
          .from('teams')
          .select(`
            *,
            leader:profiles!teams_leader_id_fkey(*),
            team_members(count)
          `)
          .in('id', memberTeamIds)
          .order('created_at', { ascending: false })

        if (memberTeamData) {
          setMemberTeams(memberTeamData.map(toTeamWithCount))
        }
      }

      setLoading(false)
    }

    fetchMyTeams()
  }, [supabase])

  const hasTeams = leaderTeams.length > 0 || memberTeams.length > 0

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title={t('title')}
        action={user ? (
          <Link href="/teams/new">
            <Button size="sm">{t('create')}</Button>
          </Link>
        ) : undefined}
      />

      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </div>
      )}

      {!loading && !user && (
        <EmptyState
          icon={Users}
          message="チームを表示するにはログインしてください"
          action={
            <Link href="/login">
              <Button size="sm">ログイン</Button>
            </Link>
          }
        />
      )}

      {!loading && user && !hasTeams && (
        <EmptyState
          icon={Users}
          message={t('empty')}
          action={
            <Link href="/teams/new">
              <Button size="sm">{t('createFirst')}</Button>
            </Link>
          }
        />
      )}

      {!loading && hasTeams && (
        <div className="space-y-6">
          {leaderTeams.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{t('myTeams')}</h2>
              <div className="grid gap-2">
                {leaderTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

          {memberTeams.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">メンバーとして所属</h2>
              <div className="grid gap-2">
                {memberTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
