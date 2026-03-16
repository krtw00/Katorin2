'use client'

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

type Tournament = {
  id: string
  title: string
  status: string
  entry_type: string
  tournament_format: string
  block_count: number | null
  swiss_round_count: number | null
  rounds_to_win: number | null
  order_size: number
  sub_count: number
  players_per_round: number
  current_round: number | null
}

type TeamEntry = {
  id: string
  team_id: string
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
  const [entries, setEntries] = useState<TeamEntry[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [blockCount, setBlockCount] = useState(tournament.block_count || 2)

  const supabase = createClient()
  const isRoundRobin = tournament.tournament_format === 'round_robin'
  const isSwiss = tournament.tournament_format === 'swiss'

  const loadData = useCallback(async () => {
    const [entriesRes, blocksRes, matchesRes] = await Promise.all([
      supabase
        .from('team_entries')
        .select('*, team:teams(id, name)')
        .eq('tournament_id', tournament.id),
      supabase
        .from('tournament_blocks')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('block_order'),
      supabase
        .from('matches')
        .select('*, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
        .eq('tournament_id', tournament.id)
        .order('round')
        .order('match_number'),
    ])

    setEntries((entriesRes.data as unknown as TeamEntry[]) || [])
    setBlocks((blocksRes.data as Block[]) || [])
    setMatches((matchesRes.data as unknown as Match[]) || [])
    setLoading(false)
  }, [supabase, tournament.id])

  useEffect(() => { loadData() }, [loadData])

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
      await supabase.from('tournament_blocks').delete().eq('tournament_id', tournament.id)

      // ブロック作成
      const blockNames = 'ABCDEFGH'.split('')
      const newBlocks = []
      for (let i = 0; i < blockCount; i++) {
        const { data } = await supabase
          .from('tournament_blocks')
          .insert({
            tournament_id: tournament.id,
            block_name: `Block ${blockNames[i] || i + 1}`,
            block_order: i + 1,
            series_id: (tournament as Record<string, unknown>).series_id as string | null ?? null,
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
        .from('tournaments')
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
      await supabase.from('matches').delete().eq('tournament_id', tournament.id)

      let matchCounter = 0

      for (const block of blocks) {
        const blockEntries = entries.filter(e => e.block_id === block.id)
        const teamIds = blockEntries.map(e => e.team_id)

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
              tournament_id: tournament.id,
              round: week + 1,
              match_number: matchCounter,
              team1_id: t1,
              team2_id: t2,
              block_id: block.id,
              status: 'pending',
            })
          }
          const last = teams.pop()!
          teams.splice(1, 0, last)
        }
      }

      await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', tournament.id)

      await loadData()
      onUpdateAction()
    } catch {
      setError(t('generateFailed'))
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
      const currentRound = Math.max(...matches.map(m => m.round), 0)
      const nextRound = currentRound + 1

      // 未完了の試合がないか確認
      const pendingMatches = matches.filter(m => m.round === currentRound && m.status !== 'completed')
      if (currentRound > 0 && pendingMatches.length > 0) {
        setError(t('pendingMatches', { round: currentRound, count: pendingMatches.length }))
        return
      }

      // 現在のスタンディングを取得
      const { data: standings } = await supabase
        .from('swiss_rankings')
        .select('*')
        .eq('tournament_id', tournament.id)

      // 過去のペアリングを収集
      const previousPairings = new Set<string>()
      matches.forEach(m => {
        if (m.team1_id && m.team2_id) {
          const key = m.team1_id < m.team2_id
            ? `${m.team1_id}:${m.team2_id}`
            : `${m.team2_id}:${m.team1_id}`
          previousPairings.add(key)
        }
      })

      // ペアリング用データ
      const teamStandings = entries.map(e => {
        const s = standings?.find(s => s.team_id === e.team_id)
        return {
          team_id: e.team_id,
          team_points: Number(s?.total_team_points || 0),
          win_points: Number(s?.total_win_points || 0),
          had_bye: false,
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
      const maxMatchNumber = Math.max(...matches.map(m => m.match_number), 0)
      for (let i = 0; i < pairings.length; i++) {
        await supabase.from('matches').insert({
          tournament_id: tournament.id,
          round: nextRound,
          match_number: maxMatchNumber + i + 1,
          team1_id: pairings[i].team1_id,
          team2_id: pairings[i].team2_id,
          status: 'pending',
        })
      }

      if (nextRound === 1) {
        await supabase
          .from('tournaments')
          .update({ status: 'in_progress', current_round: 1 })
          .eq('id', tournament.id)
      } else {
        await supabase
          .from('tournaments')
          .update({ current_round: nextRound })
          .eq('id', tournament.id)
      }

      await loadData()
      onUpdateAction()
    } catch {
      setError(t('matchmakingFailed'))
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <p>{tc('loading')}</p>

  const completedMatchCount = matches.filter(m => m.status === 'completed').length
  const totalMatchCount = matches.length
  const currentRound = Math.max(...matches.map(m => m.round), 0)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">{error}</div>
      )}

      {/* エントリーチーム */}
      <Card>
        <CardHeader>
          <CardTitle>{t('entryTeams')}</CardTitle>
          <CardDescription>{entries.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map(block => {
                const blockEntries = entries.filter(e => e.block_id === block.id)
                return (
                  <div key={block.id}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{block.block_name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {blockEntries.map(e => (
                        <Badge key={e.id} variant="secondary">
                          {(e.team as { name: string })?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entries.map(e => (
                <Badge key={e.id} variant="outline">
                  {(e.team as { name: string })?.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ブロック管理（総当たり形式のみ） */}
      {isRoundRobin && tournament.status === 'recruiting' && (
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
                onChange={(e) => setBlockCount(parseInt(e.target.value) || 2)}
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

      {/* 対戦カード生成 */}
      {isRoundRobin && blocks.length > 0 && matches.length === 0 && (
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

      {/* スイスドロー マッチメイキング */}
      {isSwiss && (
        <Card>
          <CardHeader>
            <CardTitle>{t('swissProgress')}</CardTitle>
            <CardDescription>
              {currentRound > 0
                ? t('swissRoundStatus', { current: currentRound, total: tournament.swiss_round_count || '?', completed: completedMatchCount, matches: totalMatchCount })
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
            <CardDescription>{t('matchCount', { completed: completedMatchCount, total: totalMatchCount })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches.slice(-10).map(m => {
                const t1Name = (m.team1 as { name: string } | null)?.name || 'TBD'
                const t2Name = (m.team2 as { name: string } | null)?.name || 'TBD'
                return (
                  <div key={m.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span>R{m.round} - {t1Name} vs {t2Name}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'completed' && (
                        <span className="font-mono">{m.team1_round_wins}-{m.team2_round_wins}</span>
                      )}
                      <Badge variant={m.status === 'completed' ? 'secondary' : 'outline'}>
                        {m.status === 'completed' ? t('matchCompleted') : t('matchPending')}
                      </Badge>
                      <a href={`/tournaments/${tournament.id}/wars/${m.id}`}>
                        <Button variant="ghost" size="sm">{t('matchDetail')}</Button>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <a href={`/tournaments/${tournament.id}/wars`}>
                <Button variant="outline">{t('warList')}</Button>
              </a>
              <a href={`/tournaments/${tournament.id}/standings`}>
                <Button variant="outline">{t('standings')}</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
