'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
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
  generateTeamSingleEliminationBracket,
  generateTeamDoubleEliminationBracket,
} from '@/lib/tournament/bracket-generator'

type Tournament = {
  id: string
  title: string
  status: string
  entry_type: string
  format: string
  block_count: number | null
  swiss_round_count: number | null
  rounds_to_win: number | null
  order_size: number
  sub_count: number
  players_per_round: number
  current_round: number | null
  league_id?: string | null
}

type TeamEntry = {
  id: string
  team_id: string
  entry_number: number
  block_id: string | null
  team: { id: string; name: string }
}

type Block = {
  id: string
  block_name: string
  block_order: number
}

type Match = {
  id: string
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  team1_round_wins: number
  team2_round_wins: number
  status: string
  block_id: string | null
  team1: { name: string } | null
  team2: { name: string } | null
}

type Props = {
  tournament: Tournament
  onUpdateAction: () => void
}

export function TeamTournamentManage({ tournament, onUpdateAction }: Props) {
  const t = useTranslations('tournament.teamManage')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')

  const [entries, setEntries] = useState<TeamEntry[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState('')
  const [blockCount, setBlockCount] = useState(tournament.block_count || 2)
  const [roundStatus, setRoundStatus] = useState(tournament.status)

  const supabase = createClient()
  const isRoundRobin = tournament.format === 'round_robin'
  const isSwiss = tournament.format === 'swiss'
  const isSingleElimination = tournament.format === 'single_elimination'
  const isDoubleElimination = tournament.format === 'double_elimination'
  const isElimination = isSingleElimination || isDoubleElimination

  useEffect(() => {
    setRoundStatus(tournament.status)
  }, [tournament.status])

  const loadData = useCallback(async () => {
    const [entriesRes, blocksRes, matchesRes] = await Promise.all([
      supabase
        .from('team_entries')
        .select('*, team:teams(id, name)')
        .eq('round_id', tournament.id)
        .order('entry_number', { ascending: true }),
      supabase
        .from('round_blocks')
        .select('*')
        .eq('round_id', tournament.id)
        .order('block_order'),
      supabase
        .from('matches')
        .select('*, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
        .eq('round_id', tournament.id)
        .order('round')
        .order('match_number'),
    ])

    setEntries((entriesRes.data as unknown as TeamEntry[]) || [])
    setBlocks((blocksRes.data as Block[]) || [])
    setMatches((matchesRes.data as unknown as Match[]) || [])
    setLoading(false)
  }, [supabase, tournament.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateRoundStatus = async (nextStatus: 'in_progress' | 'completed') => {
    setUpdatingStatus(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ status: nextStatus })
        .eq('id', tournament.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      setRoundStatus(nextStatus)
      onUpdateAction()
    } catch {
      setError(t('statusUpdateFailed'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ブロック作成 + チーム振分け
  const handleCreateBlocks = async () => {
    setGenerating(true)
    setError('')

    try {
      if (entries.length < 2) {
        setError(t('minTeams'))
        return
      }

      // 既存ブロック削除
      await supabase.from('round_blocks').delete().eq('round_id', tournament.id)

      // ブロック作成
      const blockNames = 'ABCDEFGH'.split('')
      const newBlocks = []
      for (let i = 0; i < blockCount; i++) {
        const { data } = await supabase
          .from('round_blocks')
          .insert({
            round_id: tournament.id,
            block_name: `Block ${blockNames[i] || i + 1}`,
            block_order: i + 1,
            league_id: tournament.league_id ?? null,
          })
          .select()
          .single()
        if (data) newBlocks.push(data)
      }

      // シャッフルして振分け
      const shuffled = [...entries].sort(() => Math.random() - 0.5)
      for (let i = 0; i < shuffled.length; i++) {
        const blockIdx = i % blockCount
        await supabase
          .from('team_entries')
          .update({ block_id: newBlocks[blockIdx].id })
          .eq('id', shuffled[i].id)
      }

      // tournament更新
      await supabase
        .from('rounds')
        .update({ block_count: blockCount })
        .eq('id', tournament.id)

      await loadData()
    } catch {
      setError(t('createBlocksFailed'))
    } finally {
      setGenerating(false)
    }
  }

  // 総当たり対戦カード生成
  const handleGenerateRoundRobin = async () => {
    setGenerating(true)
    setError('')

    try {
      // 既存matches削除
      await supabase.from('matches').delete().eq('round_id', tournament.id)

      let matchCounter = 0

      for (const block of blocks) {
        const blockEntries = entries.filter((e) => e.block_id === block.id)
        const teamIds = blockEntries.map((e) => e.team_id)

        // 総当たりペアリング生成
        const teams = [...teamIds]
        if (teams.length % 2 === 1) teams.push('BYE')
        const n = teams.length

        for (let week = 0; week < n - 1; week++) {
          for (let i = 0; i < n / 2; i++) {
            const t1 = teams[i]
            const t2 = teams[n - 1 - i]
            if (t1 === 'BYE' || t2 === 'BYE') continue

            matchCounter++
            await supabase.from('matches').insert({
              round_id: tournament.id,
              round: week + 1,
              match_number: matchCounter,
              team1_id: t1,
              team2_id: t2,
              block_id: block.id,
              status: 'pending',
            })
          }
          const last = teams.pop()
          if (last) {
            teams.splice(1, 0, last)
          }
        }
      }

      await loadData()
      onUpdateAction()
    } catch {
      setError(t('generateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  // シングル / ダブルエリミブラケット生成
  const handleGenerateEliminationBracket = async () => {
    setGenerating(true)
    setError('')

    try {
      if (entries.length < 2) {
        setError(t('minTeams'))
        return
      }

      await supabase.from('matches').delete().eq('round_id', tournament.id)

      const seededTeams = [...entries]
        .sort((a, b) => a.entry_number - b.entry_number)
        .map((entry) => ({
          id: entry.team_id,
          entry_number: entry.entry_number,
        }))

      const bracketMatches = isDoubleElimination
        ? generateTeamDoubleEliminationBracket(tournament.id, seededTeams)
        : generateTeamSingleEliminationBracket(tournament.id, seededTeams)

      const { error: insertError } = await supabase.from('matches').insert(bracketMatches)
      if (insertError) {
        setError(insertError.message)
        return
      }

      await loadData()
      onUpdateAction()
    } catch {
      setError(t('generateBracketFailed'))
    } finally {
      setGenerating(false)
    }
  }

  // スイスドロー次ラウンド生成
  const handleGenerateSwissRound = async () => {
    setGenerating(true)
    setError('')

    try {
      // 現在のラウンド数を確認
      const currentRound = Math.max(...matches.map((m) => m.round), 0)
      const nextRound = currentRound + 1

      // 未完了の試合がないか確認
      const pendingMatches = matches.filter(
        (m) => m.round === currentRound && m.status !== 'completed' && m.status !== 'bye'
      )
      if (currentRound > 0 && pendingMatches.length > 0) {
        setError(t('pendingMatches', { round: currentRound, count: pendingMatches.length }))
        return
      }

      // 現在のスタンディングを取得
      const { data: standings } = await supabase
        .from('round_swiss_rankings')
        .select('*')
        .eq('round_id', tournament.id)

      // 過去のペアリングを収集
      const previousPairings = new Set<string>()
      matches.forEach((m) => {
        if (m.team1_id && m.team2_id) {
          const key = m.team1_id < m.team2_id
            ? `${m.team1_id}:${m.team2_id}`
            : `${m.team2_id}:${m.team1_id}`
          previousPairings.add(key)
        }
      })

      // ペアリング用データ
      const teamStandings = entries.map((e) => {
        const s = standings?.find((row) => row.team_id === e.team_id)
        return {
          team_id: e.team_id,
          team_points: Number(s?.total_team_points || 0),
          win_points: Number(s?.total_win_points || 0),
        }
      })

      // ソート
      teamStandings.sort((a, b) => {
        if (a.team_points !== b.team_points) return b.team_points - a.team_points
        return b.win_points - a.win_points
      })

      // ペアリング
      const pairings: { team1_id: string; team2_id: string }[] = []
      const used = new Set<string>()

      if (nextRound === 1) {
        // Round 1: ランダム
        const shuffled = [...teamStandings].sort(() => Math.random() - 0.5)
        for (let i = 0; i < shuffled.length - 1; i += 2) {
          pairings.push({ team1_id: shuffled[i].team_id, team2_id: shuffled[i + 1].team_id })
        }
      } else {
        // 上位からペアリング
        for (const team of teamStandings) {
          if (used.has(team.team_id)) continue
          for (const opp of teamStandings) {
            if (opp.team_id === team.team_id || used.has(opp.team_id)) continue
            const key = team.team_id < opp.team_id
              ? `${team.team_id}:${opp.team_id}`
              : `${opp.team_id}:${team.team_id}`
            if (previousPairings.has(key)) continue
            pairings.push({ team1_id: team.team_id, team2_id: opp.team_id })
            used.add(team.team_id)
            used.add(opp.team_id)
            break
          }
        }
      }

      // matches挿入
      const maxMatchNumber = Math.max(...matches.map((m) => m.match_number), 0)
      for (let i = 0; i < pairings.length; i++) {
        await supabase.from('matches').insert({
          round_id: tournament.id,
          round: nextRound,
          match_number: maxMatchNumber + i + 1,
          team1_id: pairings[i].team1_id,
          team2_id: pairings[i].team2_id,
          status: 'pending',
        })
      }

      await supabase
        .from('rounds')
        .update({ current_round: nextRound })
        .eq('id', tournament.id)

      await loadData()
      onUpdateAction()
    } catch {
      setError(t('matchmakingFailed'))
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <p>{tc('loading')}</p>

  const resolvedMatchCount = matches.filter((m) => m.status === 'completed' || m.status === 'bye').length
  const totalMatchCount = matches.length
  const currentRound = Math.max(...matches.map((m) => m.round), 0)

  const canStartRound = roundStatus === 'draft' && totalMatchCount > 0
  const canCompleteRound = roundStatus === 'in_progress' && totalMatchCount > 0 && resolvedMatchCount === totalMatchCount

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">{error}</div>
      )}

      {/* ラウンドステータス管理 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('statusManage')}</CardTitle>
          <CardDescription>
            {t('currentStatus', { status: tl(`tournamentStatus.${roundStatus}`) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {roundStatus === 'draft' && (
              <Button
                onClick={() => updateRoundStatus('in_progress')}
                disabled={!canStartRound || updatingStatus}
              >
                {t('startRound')}
              </Button>
            )}
            {roundStatus === 'in_progress' && (
              <Button
                variant="secondary"
                onClick={() => updateRoundStatus('completed')}
                disabled={!canCompleteRound || updatingStatus}
              >
                {t('completeRound')}
              </Button>
            )}
          </div>
          {roundStatus === 'draft' && !canStartRound && (
            <p className="text-sm text-muted-foreground">{t('startDisabled')}</p>
          )}
          {roundStatus === 'in_progress' && !canCompleteRound && (
            <p className="text-sm text-muted-foreground">{t('completeDisabled')}</p>
          )}
        </CardContent>
      </Card>

      {/* エントリーチーム */}
      <Card>
        <CardHeader>
          <CardTitle>{t('entryTeams')}</CardTitle>
          <CardDescription>
            {entries.length}
            {isElimination ? ` / ${t('seedOrder')}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block) => {
                const blockEntries = entries
                  .filter((e) => e.block_id === block.id)
                  .sort((a, b) => a.entry_number - b.entry_number)
                return (
                  <div key={block.id}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{block.block_name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {blockEntries.map((e) => (
                        <Badge key={e.id} variant="secondary">
                          #{e.entry_number} {(e.team as { name: string })?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entries.map((e) => (
                <Badge key={e.id} variant="outline">
                  #{e.entry_number} {(e.team as { name: string })?.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ブロック管理（総当たり形式のみ） */}
      {isRoundRobin && roundStatus === 'draft' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('blockDivision')}</CardTitle>
            <CardDescription>{t('blockDivisionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">{t('blockCount')}</label>
              <Input
                type="number"
                min="1"
                max="8"
                value={blockCount}
                onChange={(e) => setBlockCount(parseInt(e.target.value, 10) || 2)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {t('teamsPerBlock', { count: Math.ceil(entries.length / blockCount) })}
              </span>
            </div>
            <Button onClick={handleCreateBlocks} disabled={generating || entries.length < 2}>
              {generating ? t('creating') : blocks.length > 0 ? t('recreateBlocks') : t('createBlocks')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 総当たり対戦カード生成 */}
      {isRoundRobin && roundStatus === 'draft' && blocks.length > 0 && matches.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('generateMatches')}</CardTitle>
            <CardDescription>{t('generateMatchesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateRoundRobin} disabled={generating}>
              {generating ? tc('generating') : t('generateAndStart')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* シングル/ダブルエリミ ブラケット生成 */}
      {isElimination && roundStatus === 'draft' && matches.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('generateBracket')}</CardTitle>
            <CardDescription>{t('generateBracketDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateEliminationBracket} disabled={generating}>
              {generating ? tc('generating') : t('generateBracketButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* スイスドロー マッチメイキング */}
      {isSwiss && roundStatus !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('swissProgress')}</CardTitle>
            <CardDescription>
              {currentRound > 0
                ? t('swissRoundStatus', {
                  current: currentRound,
                  total: tournament.swiss_round_count || '?',
                  completed: resolvedMatchCount,
                  matches: totalMatchCount,
                })
                : t('notStarted')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateSwissRound} disabled={generating}>
              {generating
                ? tc('generating')
                : currentRound === 0
                  ? t('generateRound1')
                  : t('generateNextRound', { n: currentRound + 1 })}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 試合進行状況 */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('matchProgress')}</CardTitle>
            <CardDescription>{t('matchCount', { completed: resolvedMatchCount, total: totalMatchCount })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches.slice(-10).map((m) => {
                const t1Name = (m.team1 as { name: string } | null)?.name || 'TBD'
                const t2Name = (m.team2 as { name: string } | null)?.name || 'TBD'
                return (
                  <div key={m.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span>R{m.round} - {t1Name} vs {t2Name}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'completed' && (
                        <span className="font-mono">{m.team1_round_wins}-{m.team2_round_wins}</span>
                      )}
                      <Badge variant={m.status === 'completed' || m.status === 'bye' ? 'secondary' : 'outline'}>
                        {m.status === 'completed'
                          ? t('matchCompleted')
                          : m.status === 'bye'
                            ? t('matchBye')
                            : t('matchPending')}
                      </Badge>
                      <Link href={`/tournaments/${tournament.id}/wars/${m.id}`}>
                        <Button variant="ghost" size="sm">{t('matchDetail')}</Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/tournaments/${tournament.id}/wars`}>
                <Button variant="outline">{t('warList')}</Button>
              </Link>
              <Link href={`/tournaments/${tournament.id}/standings`}>
                <Button variant="outline">{t('standings')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
