'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  canManageLeagueMembers,
  canOperateLeague,
  getLeagueOrganizerRole,
  type LeagueOrganizerRole,
} from '@/lib/league-organizer-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Tables } from '@/types/database'

type Props = {
  params: Promise<{ id: string }>
}

type League = Tables<'leagues'>
type Profile = Tables<'profiles'>
type LeagueOrganizerMember = Tables<'league_organizer_members'> & {
  user: Profile | Profile[] | null
}
type LeagueAuditLog = Tables<'league_audit_logs'> & {
  actor: Profile | Profile[] | null
}

function normalizeProfile(profile: Profile | Profile[] | null | undefined) {
  return Array.isArray(profile) ? (profile[0] ?? null) : (profile ?? null)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeagueOperatorsPage({ params }: Props) {
  const t = useTranslations('leagues.operators')
  const tDetail = useTranslations('leagues.detail')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [leagueId, setLeagueId] = useState<string>('')
  const [league, setLeague] = useState<(League & { organizer: Profile | Profile[] | null }) | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<LeagueOrganizerRole>(null)
  const [members, setMembers] = useState<LeagueOrganizerMember[]>([])
  const [auditLogs, setAuditLogs] = useState<LeagueAuditLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)

  const canManageMembers = canManageLeagueMembers(currentRole)

  const loadData = async () => {
    const { id } = await params
    setLeagueId(id)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('*, organizer:profiles!leagues_organizer_id_fkey(*)')
      .eq('id', id)
      .single()

    if (leagueError || !leagueData) {
      setError(t('notFound'))
      setLoading(false)
      return
    }

    const role = await getLeagueOrganizerRole(supabase, id, user.id)
    if (!canOperateLeague(role)) {
      setError(t('noPermission'))
      setLoading(false)
      return
    }

    const [{ data: memberData }, { data: auditData }] = await Promise.all([
      supabase
        .from('league_organizer_members')
        .select('*, user:profiles!league_organizer_members_user_id_fkey(*)')
        .eq('league_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('league_audit_logs')
        .select('*, actor:profiles!league_audit_logs_actor_user_id_fkey(*)')
        .eq('league_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setLeague(leagueData as League & { organizer: Profile | Profile[] | null })
    setCurrentRole(role)
    setMembers((memberData || []) as LeagueOrganizerMember[])
    setAuditLogs((auditData || []) as LeagueAuditLog[])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const handleSearch = async () => {
    if (!canManageMembers) return

    const query = searchQuery.trim()
    if (!query || !leagueId) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setError('')

    try {
      const escaped = query.replace(/[%_,]/g, '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${escaped}%,discord_id.ilike.%${escaped}%`)
        .limit(10)

      const ownerId = league?.organizer_id
      const existingIds = new Set(members.map((member) => member.user_id))
      const filtered = (data || []).filter((profile) => profile.id !== ownerId && !existingIds.has(profile.id))

      setSearchResults(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async (profileId: string) => {
    if (!canManageMembers || !leagueId || !currentUserId) return

    setAddingUserId(profileId)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('league_organizer_members')
        .insert({
          league_id: leagueId,
          user_id: profileId,
          role: 'staff',
          active: true,
          created_by: currentUserId,
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      await loadData()
      setSearchResults((prev) => prev.filter((profile) => profile.id !== profileId))
      setSearchQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setAddingUserId(null)
    }
  }

  const handleRoleChange = async (memberId: string, role: 'admin' | 'staff') => {
    if (!canManageMembers) return

    setSavingMemberId(memberId)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('league_organizer_members')
        .update({ role })
        .eq('id', memberId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setSavingMemberId(null)
    }
  }

  const handleToggleActive = async (memberId: string, active: boolean) => {
    if (!canManageMembers) return

    setSavingMemberId(memberId)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('league_organizer_members')
        .update({ active })
        .eq('id', memberId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setSavingMemberId(null)
    }
  }

  const renderRoleBadge = (role: LeagueOrganizerRole | 'admin' | 'staff') => {
    const variant = role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline'
    return <Badge variant={variant}>{t(`roles.${role}`)}</Badge>
  }

  const translateTableName = (tableName: string) => {
    const key = `audit.tableNames.${tableName}`
    const translated = t(key)
    return translated === key ? tableName : translated
  }

  const translateAction = (action: string) => {
    const key = `audit.actions.${action}`
    const translated = t(key)
    return translated === key ? action : translated
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  if (error && !league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded bg-destructive/15 px-4 py-3 text-destructive">{error}</div>
      </div>
    )
  }

  if (!league) return null

  const organizer = normalizeProfile(league.organizer)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Link href={`/leagues/${league.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          {tDetail('backToDetail')}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{league.title}</p>
          </div>
          <div>{renderRoleBadge(currentRole)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded bg-destructive/15 px-4 py-3 text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('members.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizer && (
            <div className="rounded-lg border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {organizer.avatar_url && <AvatarImage src={organizer.avatar_url} alt={organizer.display_name} />}
                    <AvatarFallback>{organizer.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{organizer.display_name}</p>
                    <p className="text-xs text-muted-foreground">{t('members.ownerHint')}</p>
                  </div>
                </div>
                {renderRoleBadge('owner')}
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('members.name')}</TableHead>
                <TableHead>{t('members.role')}</TableHead>
                <TableHead>{t('members.status')}</TableHead>
                <TableHead>{t('members.joined')}</TableHead>
                <TableHead className="w-48">{t('members.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const profile = normalizeProfile(member.user)
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                          <AvatarFallback>{profile?.display_name?.slice(0, 2).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile?.display_name || t('members.unknownUser')}</p>
                          {profile?.discord_id && (
                            <p className="text-xs text-muted-foreground">Discord: {profile.discord_id}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageMembers ? (
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={member.role}
                          disabled={savingMemberId === member.id}
                          onChange={(event) => handleRoleChange(member.id, event.target.value as 'admin' | 'staff')}
                        >
                          <option value="staff">{t('roles.staff')}</option>
                          <option value="admin">{t('roles.admin')}</option>
                        </select>
                      ) : (
                        renderRoleBadge(member.role as 'admin' | 'staff')
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? 'secondary' : 'outline'}>
                        {member.active ? t('members.active') : t('members.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(member.created_at)}</TableCell>
                    <TableCell>
                      {canManageMembers ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={savingMemberId === member.id}
                          onClick={() => handleToggleActive(member.id, !member.active)}
                        >
                          {member.active ? t('members.deactivate') : t('members.activate')}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t('members.viewOnly')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('audit.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.when')}</TableHead>
                  <TableHead>{t('audit.who')}</TableHead>
                  <TableHead>{t('audit.action')}</TableHead>
                  <TableHead>{t('audit.target')}</TableHead>
                  <TableHead>{t('audit.fields')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => {
                  const actor = normalizeProfile(log.actor)
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.created_at)}</TableCell>
                      <TableCell>{actor?.display_name || t('audit.system')}</TableCell>
                      <TableCell>{translateAction(log.action)}</TableCell>
                      <TableCell>{translateTableName(log.table_name)}</TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {log.changed_fields?.length ? log.changed_fields.join(', ') : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('audit.empty')}</p>
          )}
        </CardContent>
      </Card>

      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle>{t('search.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('search.placeholder')}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? t('search.searching') : t('search.submit')}
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="font-medium">{profile.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[profile.discord_id, profile.master_duel_id].filter(Boolean).join(' / ') || profile.id}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={addingUserId === profile.id}
                      onClick={() => handleAddMember(profile.id)}
                    >
                      {addingUserId === profile.id ? t('search.adding') : t('search.add')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('search.empty')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
