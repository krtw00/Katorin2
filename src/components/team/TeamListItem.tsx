'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TeamWithLeader } from '@/types/team'

type Props = {
  team: TeamWithLeader & { member_count?: number }
}

export function TeamListItem({ team }: Props) {
  const t = useTranslations('team.listItem')

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={team.avatar_url || undefined} alt={team.name} />
              <AvatarFallback>{team.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{team.name}</h3>
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {team.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>{t('leader')}: {team.leader.display_name}</span>
                {team.member_count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {t('memberCount', { count: team.member_count })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

type TeamListSectionProps = {
  title: string
  teams: (TeamWithLeader & { member_count?: number })[]
}

export function TeamListSection({ title, teams }: TeamListSectionProps) {
  if (teams.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-3">
        {teams.map((team) => (
          <TeamListItem key={team.id} team={team} />
        ))}
      </div>
    </div>
  )
}
