'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'

type Member = {
  userId: string
  displayName: string
  deckName: string
}

type Props = {
  matchId: string
  tournamentId: string
  team1Id: string
  team2Id: string
  team1Name: string
  team2Name: string
  team1Members: Member[]
  team2Members: Member[]
  playersPerRound: number
  roundsToWin: number
  matchFormat: string // bo1, bo3, bo5
}

type RoundResult = {
  matches: {
    player1Id: string
    player2Id: string
    player1Score: number
    player2Score: number
    winnerId: string | null
  }[]
}

export function WarResultForm({
  matchId,
  tournamentId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  team1Members,
  team2Members,
  playersPerRound,
  roundsToWin,
  matchFormat,
}: Props) {
  const maxDuelWins = matchFormat === 'bo5' ? 3 : matchFormat === 'bo3' ? 2 : 1
  const maxRounds = roundsToWin * 2 - 1 // BO3 rounds = 3

  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [team1RoundWins, setTeam1RoundWins] = useState(0)
  const [team2RoundWins, setTeam2RoundWins] = useState(0)

  const router = useRouter()
  const supabase = createClient()

  const matchFinished = team1RoundWins >= roundsToWin || team2RoundWins >= roundsToWin

  // 新しいラウンドを開始
  const startNewRound = () => {
    if (matchFinished) return
    const roundNum = currentRound + 1

    // デフォルトのマッチアップ（メンバーを順にペアリング）
    const matches = []
    for (let i = 0; i < playersPerRound; i++) {
      const p1 = team1Members[i % team1Members.length]
      const p2 = team2Members[i % team2Members.length]
      matches.push({
        player1Id: p1.userId,
        player2Id: p2.userId,
        player1Score: 0,
        player2Score: 0,
        winnerId: null as string | null,
      })
    }

    setRounds([...rounds, { matches }])
    setCurrentRound(roundNum)
  }

  // マッチスコア更新
  const updateScore = (roundIdx: number, matchIdx: number, field: 'player1Score' | 'player2Score', value: number) => {
    const updated = [...rounds]
    updated[roundIdx].matches[matchIdx][field] = value

    // 勝者自動判定
    const match = updated[roundIdx].matches[matchIdx]
    if (match.player1Score >= maxDuelWins) {
      match.winnerId = match.player1Id
    } else if (match.player2Score >= maxDuelWins) {
      match.winnerId = match.player2Id
    } else {
      match.winnerId = null
    }

    setRounds(updated)
  }

  // ラウンド確定
  const confirmRound = () => {
    const round = rounds[currentRound - 1]
    if (!round) return

    // 全マッチに勝者がいるか確認
    const allDone = round.matches.every(m => m.winnerId !== null)
    if (!allDone) {
      setError('全マッチの勝者を確定してください')
      return
    }

    setError('')

    // 星取戦判定（2人以上勝利でラウンド勝ち）
    const t1Wins = round.matches.filter(m => m.winnerId === m.player1Id).length
    if (t1Wins >= Math.ceil(playersPerRound / 2)) {
      setTeam1RoundWins(prev => prev + 1)
    } else {
      setTeam2RoundWins(prev => prev + 1)
    }
  }

  // 全結果をDBに保存
  const submitAllResults = async () => {
    setSubmitting(true)
    setError('')

    try {
      let totalT1Wins = 0
      let totalT2Wins = 0

      for (let r = 0; r < rounds.length; r++) {
        const round = rounds[r]

        // war_round 作成
        const { data: warRound, error: wrError } = await supabase
          .from('war_rounds')
          .insert({
            match_id: matchId,
            round_number: r + 1,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (wrError) throw new Error(wrError.message)

        let roundT1Wins = 0
        let roundT2Wins = 0

        // individual_matches 作成
        for (let m = 0; m < round.matches.length; m++) {
          const match = round.matches[m]
          const p1Won = match.winnerId === match.player1Id

          if (p1Won) { roundT1Wins++; totalT1Wins++ }
          else { roundT2Wins++; totalT2Wins++ }

          await supabase.from('individual_matches').insert({
            match_id: matchId,
            war_round_id: warRound.id,
            play_order: r * playersPerRound + m + 1,
            player1_id: match.player1Id,
            player2_id: match.player2Id,
            player1_score: match.player1Score,
            player2_score: match.player2Score,
            player1_duel_wins: match.player1Score,
            player2_duel_wins: match.player2Score,
            winner_id: match.winnerId,
            status: 'completed',
          })
        }

        // war_round 更新
        const roundWinner = roundT1Wins >= Math.ceil(playersPerRound / 2) ? team1Id : team2Id
        await supabase.from('war_rounds').update({
          team1_match_wins: roundT1Wins,
          team2_match_wins: roundT2Wins,
          winner_team_id: roundWinner,
        }).eq('id', warRound.id)
      }

      // match 更新
      const winnerTeamId = team1RoundWins >= roundsToWin ? team1Id : team2Id
      await supabase.from('matches').update({
        team1_round_wins: team1RoundWins,
        team2_round_wins: team2RoundWins,
        team1_wins: totalT1Wins,
        team2_wins: totalT2Wins,
        winner_team_id: winnerTeamId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', matchId)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>結果入力</CardTitle>
        <CardDescription>
          {playersPerRound}v{playersPerRound}星取戦 × {roundsToWin}ラウンド先取
          {matchFormat !== 'bo1' && ` / マッチ戦(${matchFormat.toUpperCase()})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded text-sm">{error}</div>
        )}

        {/* ラウンドスコア表示 */}
        <div className="flex items-center justify-center gap-6 py-2">
          <span className="font-medium">{team1Name}</span>
          <span className="text-2xl font-bold">{team1RoundWins} - {team2RoundWins}</span>
          <span className="font-medium">{team2Name}</span>
        </div>

        {/* 各ラウンドの結果 */}
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Round {rIdx + 1}</h3>
              {rIdx < currentRound - 1 && (
                <Badge variant="secondary">確定済み</Badge>
              )}
            </div>
            <div className="space-y-2">
              {round.matches.map((match, mIdx) => {
                const p1 = team1Members.find(m => m.userId === match.player1Id)
                const p2 = team2Members.find(m => m.userId === match.player2Id)
                const isCurrentRound = rIdx === currentRound - 1
                const p1Won = match.winnerId === match.player1Id

                return (
                  <div key={mIdx} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                    <div className={`text-right ${match.winnerId && p1Won ? 'font-bold text-green-600' : ''}`}>
                      <div>{p1?.displayName}</div>
                      <div className="text-xs text-muted-foreground">{p1?.deckName}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCurrentRound ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max={maxDuelWins}
                            value={match.player1Score}
                            onChange={(e) => updateScore(rIdx, mIdx, 'player1Score', parseInt(e.target.value) || 0)}
                            className="w-12 h-8 text-center text-sm"
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            min="0"
                            max={maxDuelWins}
                            value={match.player2Score}
                            onChange={(e) => updateScore(rIdx, mIdx, 'player2Score', parseInt(e.target.value) || 0)}
                            className="w-12 h-8 text-center text-sm"
                          />
                        </>
                      ) : (
                        <span className="font-mono">{match.player1Score} - {match.player2Score}</span>
                      )}
                    </div>
                    <div className={`${match.winnerId && !p1Won ? 'font-bold text-green-600' : ''}`}>
                      <div>{p2?.displayName}</div>
                      <div className="text-xs text-muted-foreground">{p2?.deckName}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* アクションボタン */}
        <div className="flex gap-2">
          {currentRound > 0 && currentRound === rounds.length && !matchFinished && (
            <Button onClick={confirmRound} variant="secondary">
              Round {currentRound} 確定
            </Button>
          )}
          {(currentRound === 0 || (currentRound < maxRounds && currentRound === rounds.length && rounds[currentRound - 1]?.matches.every(m => m.winnerId))) && !matchFinished && (
            <Button onClick={startNewRound}>
              Round {currentRound + 1} 開始
            </Button>
          )}
          {matchFinished && (
            <Button onClick={submitAllResults} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? '保存中...' : '結果を保存'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
