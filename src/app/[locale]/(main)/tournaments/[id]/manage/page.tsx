'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { generateSingleEliminationBracket } from '@/lib/tournament/bracket-generator'

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentManagePage({ params }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({})
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

      setParticipants((participantsData as any) || [])
      setLoading(false)
    }

    loadData()
  }, [params])

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
    } catch (err: any) {
      setError(err.message || 'ブラケット生成に失敗しました')
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
    } catch (err) {
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
    } catch (err: any) {
      setError(err.message || 'チェックインに失敗しました')
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
    } catch (err: any) {
      setError(err.message || 'チェックイン取消に失敗しました')
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

      {/* Bracket Generation */}
      {tournament?.status === 'recruiting' && participants.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>ブラケット生成</CardTitle>
            <CardDescription>
              トーナメント表を生成して大会を開始します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateBracket} disabled={generating}>
              {generating ? '生成中...' : 'ブラケットを生成'}
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

