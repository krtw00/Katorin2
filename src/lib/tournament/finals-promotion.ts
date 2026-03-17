import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type FinalsRound = {
  source_round_id: string
  qualified_per_block: number | null
  qualified_total: number | null
}

export async function getQualifiedTeams(
  supabase: SupabaseClient<Database>,
  finalsRound: FinalsRound
): Promise<string[]> {
  const { source_round_id, qualified_per_block, qualified_total } = finalsRound

  const { data: sourceRound, error: roundError } = await supabase
    .from('rounds')
    .select('format')
    .eq('id', source_round_id)
    .single()

  if (roundError || !sourceRound) {
    throw new Error('進出元ラウンドの情報を取得できませんでした')
  }

  const format = sourceRound.format

  if (format === 'round_robin') {
    if (!qualified_per_block || qualified_per_block <= 0) return []

    const { data: standings, error: standingsError } = await supabase
      .from('round_block_standings')
      .select('team_id, block_id, rank')
      .eq('round_id', source_round_id)
      .order('block_id', { ascending: true })
      .order('rank', { ascending: true })

    if (standingsError || !standings) {
      throw new Error('ブロック別順位データを取得できませんでした')
    }

    const blockTeams = new Map<string, string[]>()
    for (const row of standings) {
      if (!row.team_id || !row.block_id || row.rank == null) continue
      if (!blockTeams.has(row.block_id)) blockTeams.set(row.block_id, [])
      const teams = blockTeams.get(row.block_id)!
      if (teams.length < qualified_per_block) teams.push(row.team_id)
    }

    const result: string[] = []
    for (const teams of blockTeams.values()) result.push(...teams)
    return result
  }

  if (format === 'swiss') {
    if (!qualified_total || qualified_total <= 0) return []

    const { data: rankings, error: rankingsError } = await supabase
      .from('round_swiss_rankings')
      .select('team_id, rank')
      .eq('round_id', source_round_id)
      .order('rank', { ascending: true })

    if (rankingsError || !rankings) {
      throw new Error('スイスドロー順位データを取得できませんでした')
    }

    return rankings
      .filter(
        (r): r is typeof r & { team_id: string } =>
          r.team_id != null && r.rank != null && r.rank <= qualified_total
      )
      .map((r) => r.team_id)
  }

  return []
}
