'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tournament,
  ParticipantWithUser,
} from '@/types/round'
import { Tables, Enums } from '@/types/database'
import { generateSingleEliminationBracket, generateDoubleEliminationBracket } from '@/lib/tournament/bracket-generator'
import { TeamTournamentManage } from '@/components/tournament/TeamTournamentManage'
import { canOperateLeague, getRoundOrganizerRole } from '@/lib/league-organizer-permissions'

type Profile = Tables<'profiles'>
type TournamentInvite = Tables<'tournament_invites'> & {
  user: Profile
}
type InviteStatus = Enums<'invite_status'>

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentManagePage({ params }: Props) {
  const t = useTranslations('tournament.manage')
  const tl = useTranslations('labels')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([])
  const [invites, setInvites] = useState<TournamentInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [checkedInOnly, setCheckedInOnly] = useState(false)
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({})
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  // Invite related state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState<Record<string, boolean>>({})
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const supabase = createClient()

  const sendWebhookNotification = async (tournamentId: string, event: string) => {
    try {
      await fetch('/api/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, tournamentId }),
      })
    } catch {
      // Webhook failure should not block the main operation
    }
  }

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params

      // Load tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', id)
        .single()

      if (tournamentError || !tournamentData) {
        setError(t('notFound'))
        setLoading(false)
        return
      }

      // Check if user is organizer
      const { data: { user } } = await supabase.auth.getUser()
      const role = user ? await getRoundOrganizerRole(supabase, id, user.id) : null
      if (!user || !canOperateLeague(role)) {
        setError(t('noManagePermission'))
        setLoading(false)
        return
      }

      setTournament(tournamentData)

      // Load participants
      const { data: participantsData } = await supabase
        .from('participants')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('round_id', id)
        .order('created_at', { ascending: true })

      setParticipants((participantsData as ParticipantWithUser[]) || [])

      // Load invites if invite_only tournament
      if (tournamentData.entry_mode === 'invite_only') {
        const { data: invitesData } = await supabase
          .from('tournament_invites')
          .select(`
            *,
            user:profiles!tournament_invites_user_id_fkey(*)
          `)
          .eq('round_id', id)
          .order('created_at', { ascending: false })

        setInvites((invitesData as TournamentInvite[]) || [])
      }

      setLoading(false)
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Search for users to invite
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !tournament) return

    setSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(10)

      // Filter out already invited users and participants
      const invitedUserIds = new Set(invites.map(i => i.user_id))
      const participantUserIds = new Set(participants.map(p => p.user_id))

      const filtered = (data || []).filter(
        u => !invitedUserIds.has(u.id) && !participantUserIds.has(u.id)
      )

      setSearchResults(filtered)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }, [searchQuery, tournament, invites, participants, supabase])

  // Send invite to user
  const handleInvite = async (userId: string) => {
    if (!tournament) return

    setInviting(prev => ({ ...prev, [userId]: true }))
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError(te('unauthorized'))
        return
      }

      const { data: invite, error: insertError } = await supabase
        .from('tournament_invites')
        .insert({
          round_id: tournament.id,
          user_id: userId,
          invited_by: user.id,
        })
        .select(`
          *,
          user:profiles!tournament_invites_user_id_fkey(*)
        `)
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Update state
      setInvites(prev => [invite as TournamentInvite, ...prev])
      setSearchResults(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invites.invite'))
    } finally {
      setInviting(prev => ({ ...prev, [userId]: false }))
    }
  }

  // Cancel invite
  const handleCancelInvite = async (inviteId: string) => {
    setCancelling(prev => ({ ...prev, [inviteId]: true }))
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('tournament_invites')
        .delete()
        .eq('id', inviteId)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      // Update state
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invites.cancel'))
    } finally {
      setCancelling(prev => ({ ...prev, [inviteId]: false }))
    }
  }

  const getInviteStatusLabel = (status: InviteStatus) => {
    const labels: Record<InviteStatus, string> = {
      pending: t('invites.pending'),
      accepted: t('invites.accepted'),
      declined: t('invites.declined'),
      expired: t('invites.expired'),
    }
    return labels[status]
  }

  const getInviteStatusVariant = (status: InviteStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<InviteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      expired: 'outline',
    }
    return variants[status]
  }

  const handleGenerateBracket = async () => {
    if (!tournament || !participants) return

    setGenerating(true)
    setError('')

    try {
      // Filter participants based on check-in status if option is enabled
      const eligibleParticipants = checkedInOnly
        ? participants.filter(p => p.checked_in_at)
        : participants

      if (eligibleParticipants.length < 2) {
        setError(checkedInOnly
          ? t('minParticipantsCheckedIn')
          : t('minParticipants')
        )
        setGenerating(false)
        return
      }

      // Generate bracket based on tournament format
      const bracketMatches = tournament.format === 'double_elimination'
        ? generateDoubleEliminationBracket(tournament.id, eligibleParticipants)
        : generateSingleEliminationBracket(tournament.id, eligibleParticipants)

      // Insert matches
      const { error: insertError } = await supabase
        .from('matches')
        .insert(bracketMatches)

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Update tournament status
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ status: 'in_progress' })
        .eq('id', tournament.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      sendWebhookNotification(tournament.id, 'bracket_published')

      // Reload page
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bracketFailed'))
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteTournament = async () => {
    if (!tournament) return

    setDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', tournament.id)

      if (deleteError) {
        setError(deleteError.message)
        setDeleting(false)
        return
      }

      router.push('/tournaments')
    } catch {
      setError(t('deleteFailed'))
      setDeleting(false)
    }
  }

  const handleCheckIn = async (participantId: string) => {
    setCheckingIn(prev => ({ ...prev, [participantId]: true }))
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', participantId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId
            ? { ...p, checked_in_at: new Date().toISOString() }
            : p
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkInFailed'))
    } finally {
      setCheckingIn(prev => ({ ...prev, [participantId]: false }))
    }
  }

  const handleUndoCheckIn = async (participantId: string) => {
    setCheckingIn(prev => ({ ...prev, [participantId]: true }))
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ checked_in_at: null })
        .eq('id', participantId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, checked_in_at: null } : p
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('undoCheckInFailed'))
    } finally {
      setCheckingIn(prev => ({ ...prev, [participantId]: false }))
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm(t('exclude') + '?')) return

    setRemoving(prev => ({ ...prev, [participantId]: true }))
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      setParticipants(prev => prev.filter(p => p.id !== participantId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('excludeFailed'))
    } finally {
      setRemoving(prev => ({ ...prev, [participantId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{tc('loading')}</p>
      </div>
    )
  }

  if (error && !tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {tournament && (
          <Badge>{tl('tournamentStatus.' + tournament.status)}</Badge>
        )}
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Status Management */}
      {tournament && (
        <Card>
          <CardHeader>
            <CardTitle>{t('statusManage')}</CardTitle>
            <CardDescription>
              {t('currentStatus', { status: tl('tournamentStatus.' + tournament.status) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {tournament.status === 'draft' && (
                <Button
                  onClick={async () => {
                    setError('')
                    const { error: updateError } = await supabase
                      .from('rounds')
                      .update({ status: 'recruiting' })
                      .eq('id', tournament.id)
                    if (updateError) {
                      setError(updateError.message)
                    } else {
                      setTournament({ ...tournament, status: 'recruiting' })
                      sendWebhookNotification(tournament.id, 'recruiting_started')
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('startRecruiting')}
                </Button>
              )}
              {tournament.status === 'in_progress' && (
                <>
                  <a href={`/tournaments/${tournament.id}/bracket`}>
                    <Button variant="outline">
                      {t('viewBracket')}
                    </Button>
                  </a>
                  <Button
                    onClick={async () => {
                      if (!confirm(t('completeConfirm'))) return
                      setError('')
                      const { error: updateError } = await supabase
                        .from('rounds')
                        .update({ status: 'completed' })
                        .eq('id', tournament.id)
                      if (updateError) {
                        setError(updateError.message)
                      } else {
                        setTournament({ ...tournament, status: 'completed' })
                        sendWebhookNotification(tournament.id, 'tournament_completed')
                      }
                    }}
                    variant="secondary"
                  >
                    {t('completeTournament')}
                  </Button>
                </>
              )}
              {tournament.status === 'recruiting' && (
                <a href={`/tournaments/${tournament.id}/edit`}>
                  <Button variant="outline">
                    {t('editSettings')}
                  </Button>
                </a>
              )}
              {tournament.status === 'completed' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('tournamentCompleted')}</p>
                  {tournament.league_id && (
                    <p className="text-sm text-green-600">{t('pointsCalculated')}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>{t('participants.title')}</CardTitle>
          <CardDescription>
            {t('participantCount', { count: participants.length })}
            {participants.filter(p => p.checked_in_at).length > 0 && (
              <> {t('checkedInCount', { count: participants.filter(p => p.checked_in_at).length })}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length > 0 ? (
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-2 p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{participant.user.display_name}</span>
                    {participant.master_duel_id && (
                      <span className="text-sm text-muted-foreground">
                        ({participant.master_duel_id})
                      </span>
                    )}
                    {participant.checked_in_at && (
                      <Badge variant="secondary" className="ml-2">
                        {t('checkedInLabel')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.checked_in_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoCheckIn(participant.id)}
                        disabled={checkingIn[participant.id]}
                      >
                        {checkingIn[participant.id] ? t('participants.processing') : t('participants.undoCheckIn')}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCheckIn(participant.id)}
                        disabled={checkingIn[participant.id]}
                      >
                        {checkingIn[participant.id] ? t('participants.processing') : t('participants.checkIn')}
                      </Button>
                    )}
                    {tournament?.status === 'recruiting' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        disabled={removing[participant.id]}
                      >
                        {removing[participant.id] ? '...' : t('exclude')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('participants.empty')}</p>
          )}
        </CardContent>
      </Card>

      {/* Invite Users - Only for invite_only tournaments */}
      {tournament?.entry_mode === 'invite_only' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('invites.title')}</CardTitle>
            <CardDescription>{t('invites.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder={t('invites.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? '...' : tc('search')}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3">
                    <span className="font-medium">{user.display_name}</span>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(user.id)}
                      disabled={inviting[user.id]}
                    >
                      {inviting[user.id] ? t('invites.inviting') : t('invites.invite')}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Invite List */}
            {invites.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('inviteList')}</h4>
                <div className="border rounded-lg divide-y">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invite.user.display_name}</span>
                        <Badge variant={getInviteStatusVariant(invite.status)}>
                          {getInviteStatusLabel(invite.status)}
                        </Badge>
                      </div>
                      {invite.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={cancelling[invite.id]}
                        >
                          {cancelling[invite.id] ? t('invites.cancelling') : t('invites.cancel')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('invites.noInvites')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bracket Generation */}
      {tournament?.status === 'recruiting' && participants.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('bracket.title')}</CardTitle>
            <CardDescription>{t('bracket.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {participants.some(p => p.checked_in_at) && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedInOnly}
                  onChange={(e) => setCheckedInOnly(e.target.checked)}
                  className="rounded"
                />
                {t('checkedInOnly')}
                <span className="text-muted-foreground">
                  ({t('checkedInRatio', { checked: participants.filter(p => p.checked_in_at).length, total: participants.length })})
                </span>
              </label>
            )}
            <Button onClick={handleGenerateBracket} disabled={generating}>
              {generating ? t('bracket.generating') : t('bracket.generate')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Tournament Management */}
      {tournament?.entry_type === 'team' && (
        <TeamTournamentManage
          tournament={{
            id: tournament.id,
            title: tournament.title,
            status: tournament.status,
            entry_type: tournament.entry_type,
            format: tournament.format,
            block_count: tournament.block_count ?? null,
            swiss_round_count: tournament.swiss_round_count ?? null,
            rounds_to_win: tournament.rounds_to_win ?? null,
            order_size: tournament.order_size ?? 3,
            sub_count: tournament.sub_count ?? 1,
            players_per_round: tournament.players_per_round ?? 3,
            current_round: tournament.current_round,
            league_id: tournament.league_id,
          }}
          onUpdateAction={() => window.location.reload()}
        />
      )}

      {/* Danger Zone - Only for draft tournaments */}
      {tournament?.status === 'draft' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t('dangerZone.title')}</CardTitle>
            <CardDescription>
              {t('dangerZone.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t('dangerZone.delete')}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('dangerZone.deleteConfirm', { title: tournament.title })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTournament}
                    disabled={deleting}
                  >
                    {deleting ? t('dangerZone.deleting') : tc('delete')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
