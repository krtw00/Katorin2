import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TeamListItem } from '@/components/team/TeamListItem'
import { TeamWithLeader, TeamRole } from '@/types/team'

type TeamWithMembership = TeamWithLeader & {
  member_count: number
  role: TeamRole
}

export default async function MyTeamsPage() {
  const t = await getTranslations('mypage.teams')
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get teams where user is a member (includes leader role)
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      role,
      team:teams(
        *,
        leader:profiles!teams_leader_id_fkey(*),
        team_members(count)
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  // Transform data
  type MembershipRow = {
    role: string
    team: TeamWithLeader & { team_members: { count: number }[] } | null
  }
  const teams: TeamWithMembership[] =
    memberships
      ?.filter((m: MembershipRow) => m.team)
      .map((m: MembershipRow) => ({
        ...m.team!,
        member_count: m.team!.team_members?.[0]?.count || 0,
        role: m.role as TeamRole,
      })) || []

  // Separate by role
  const leaderTeams = teams.filter((t) => t.role === 'leader')
  const memberTeams = teams.filter((t) => t.role === 'member')

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <Link href="/teams/new">
          <Button>{t('create')}</Button>
        </Link>
      </div>

      {/* Teams List */}
      {teams.length > 0 ? (
        <div className="space-y-6">
          {/* Leader Teams */}
          {leaderTeams.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {t('sections.leader')}
                <span className="text-sm font-normal text-muted-foreground">
                  ({leaderTeams.length})
                </span>
              </h2>
              <div className="grid gap-3">
                {leaderTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </section>
          )}

          {/* Member Teams */}
          {memberTeams.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {t('sections.member')}
                <span className="text-sm font-normal text-muted-foreground">
                  ({memberTeams.length})
                </span>
              </h2>
              <div className="grid gap-3">
                {memberTeams.map((team) => (
                  <TeamListItem key={team.id} team={team} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t('empty')}</p>
            <Link href="/teams/new">
              <Button>{t('createFirst')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Link to all teams */}
      <div className="text-center pt-4">
        <Link
          href="/teams"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('viewAll')}
        </Link>
      </div>
    </div>
  )
}
