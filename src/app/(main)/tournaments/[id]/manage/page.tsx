'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tournament,
  ParticipantWithUser,
  MatchWithPlayers,
  tournamentStatusLabels,
  matchStatusLabels,
} from '@/types/tournament'
import { generateSingleEliminationBracket, advanceWinner } from '@/lib/tournament/bracket-generator'

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentManagePage({ params }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([])
  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
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

      // Load matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          player1:profiles!matches_player1_id_fkey(*),
          player2:profiles!matches_player2_id_fkey(*),
          winner:profiles!matches_winner_id_fkey(*)
        `)
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      setMatches((matchesData as any) || [])
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

  const handleUpdateMatchResult = async (
    matchId: string,
    player1Score: number,
    player2Score: number,
    winnerId: string
  ) => {
    try {
      // Update match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Get current match with next match info
      const currentMatch = matches.find(m => m.id === matchId)
      if (!currentMatch) return

      // Advance winner to next match
      if (currentMatch.next_match_id && winnerId) {
        const nextMatchUpdate = advanceWinner(
          {
            winner_id: winnerId,
            next_match_id: currentMatch.next_match_id,
            next_match_slot: currentMatch.next_match_slot,
          },
          matches
        )

        if (nextMatchUpdate) {
          await supabase
            .from('matches')
            .update({
              player1_id: nextMatchUpdate.player1_id,
              player2_id: nextMatchUpdate.player2_id,
            })
            .eq('id', nextMatchUpdate.id)
        }
      }

      // Reload matches
      window.location.reload()
    } catch (err) {
      setError('結果の更新に失敗しました')
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length > 0 ? (
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 p-2 border rounded">
                  <span>{participant.user.display_name}</span>
                  {participant.master_duel_id && (
                    <span className="text-sm text-muted-foreground">
                      ({participant.master_duel_id})
                    </span>
                  )}
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

      {/* Matches Management */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>試合管理</CardTitle>
            <CardDescription>試合結果を入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <MatchResultsForm
              matches={matches}
              onUpdateResult={handleUpdateMatchResult}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MatchResultsForm({
  matches,
  onUpdateResult,
}: {
  matches: MatchWithPlayers[]
  onUpdateResult: (matchId: string, p1Score: number, p2Score: number, winnerId: string) => void
}) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)

  const pendingMatches = matches.filter(
    (m) => m.status === 'pending' && m.player1_id && m.player2_id
  )

  const handleSubmit = (match: MatchWithPlayers) => {
    if (!match.player1_id || !match.player2_id) return

    const winnerId = player1Score > player2Score ? match.player1_id : match.player2_id
    onUpdateResult(match.id, player1Score, player2Score, winnerId)
  }

  return (
    <div className="space-y-4">
      {pendingMatches.length > 0 ? (
        pendingMatches.map((match) => (
          <div key={match.id} className="border rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">
                  R{match.round}-{match.match_number}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {match.player1?.display_name} vs {match.player2?.display_name}
                </p>
              </div>
              <Badge>{matchStatusLabels[match.status]}</Badge>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">
                  {match.player1?.display_name} のスコア
                </label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  defaultValue={0}
                  onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">
                  {match.player2?.display_name} のスコア
                </label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  defaultValue={0}
                  onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button onClick={() => handleSubmit(match)}>結果を登録</Button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground">入力待ちの試合がありません</p>
      )}
    </div>
  )
}
