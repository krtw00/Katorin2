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
  tournamentStatusLabels,
} from '@/types/tournament'
import { Tables, InviteStatus } from '@/types/database'
import { generateSingleEliminationBracket } from '@/lib/tournament/bracket-generator'

type Profile = Tables<'profiles'>
type TournamentInvite = Tables<'tournament_invites'> & {
  user: Profile
}

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentManagePage({ params }: Props) {
  const t = useTranslations('tournament.manage')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([])
  const [invites, setInvites] = useState<TournamentInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({})

  // Invite related state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState<Record<string, boolean>>({})
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params

      // Load tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (tournamentError || !tournamentData) {
        setError('大会が見つかりませんでした')
        setLoading(false)
        return
      }

      // Check if user is organizer
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== tournamentData.organizer_id) {
        setError('管理権限がありません')
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
        .eq('tournament_id', id)
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
          .eq('tournament_id', id)
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
        setError('ログインが必要です')
        return
      }

      const { data: invite, error: insertError } = await supabase
        .from('tournament_invites')
        .insert({
          tournament_id: tournament.id,
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
      setError(err instanceof Error ? err.message : '招待に失敗しました')
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
      setError(err instanceof Error ? err.message : '招待の取消に失敗しました')
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
      // Generate bracket
      const bracketMatches = generateSingleEliminationBracket(
        tournament.id,
        participants
      )

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
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', tournament.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Reload page
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブラケット生成に失敗しました')
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
        .from('tournaments')
        .delete()
        .eq('id', tournament.id)

      if (deleteError) {
        setError(deleteError.message)
        setDeleting(false)
        return
      }

      router.push('/tournaments')
    } catch {
      setError('削除に失敗しました')
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
      setError(err instanceof Error ? err.message : 'チェックインに失敗しました')
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
      setError(err instanceof Error ? err.message : 'チェックイン取消に失敗しました')
    } finally {
      setCheckingIn(prev => ({ ...prev, [participantId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>読み込み中...</p>
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
        <h1 className="text-3xl font-bold">大会管理</h1>
        {tournament && (
          <Badge>{tournamentStatusLabels[tournament.status]}</Badge>
        )}
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>参加者一覧</CardTitle>
          <CardDescription>
            {participants.length}名が参加しています
            {participants.filter(p => p.checked_in_at).length > 0 && (
              <> （チェックイン済み: {participants.filter(p => p.checked_in_at).length}名）</>
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
                        チェックイン済み
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
                        {checkingIn[participant.id] ? '処理中...' : '取消'}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCheckIn(participant.id)}
                        disabled={checkingIn[participant.id]}
                      >
                        {checkingIn[participant.id] ? '処理中...' : 'チェックイン'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">参加者がいません</p>
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
                {searching ? '...' : '検索'}
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
                <h4 className="text-sm font-medium text-muted-foreground">招待一覧</h4>
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
          <CardContent>
            <Button onClick={handleGenerateBracket} disabled={generating}>
              {generating ? t('bracket.generating') : t('bracket.generate')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone - Only for draft tournaments */}
      {tournament?.status === 'draft' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">危険な操作</CardTitle>
            <CardDescription>
              これらの操作は取り消すことができません
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                大会を削除
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  本当に「{tournament.title}」を削除しますか？この操作は取り消せません。
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTournament}
                    disabled={deleting}
                  >
                    {deleting ? '削除中...' : '削除する'}
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

