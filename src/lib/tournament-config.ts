import { type LeagueConfig, parseLeagueConfig } from '@/lib/schemas/league-config'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database'

type SupaClient = SupabaseClient<Database>

/**
 * 大会IDからシリーズ or 大会の設定を統一的に取得する。
 * シリーズ配下 → league.league_config
 * 単発大会 → tournaments のカラム
 */
export async function getTournamentConfig(
  supabase: SupaClient,
  tournamentId: string
): Promise<LeagueConfig> {
  const { data: tournament, error } = await supabase
    .from('rounds')
    .select('league_id, order_size, sub_count, players_per_round, win_point_value, block_count, rounds_to_win, match_format')
    .eq('id', tournamentId)
    .single()

  if (error || !tournament) {
    throw new Error(`Tournament not found: ${tournamentId}`)
  }

  if (tournament.league_id) {
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_config')
      .eq('id', tournament.league_id)
      .single()

    if (leagueError || !league) {
      throw new Error(`Series not found: ${tournament.league_id}`)
    }

    return parseLeagueConfig(league.league_config)
  }

  // 単発大会: tournaments のカラムから LeagueConfig 互換の形に変換
  return parseLeagueConfig({
    orderSize: tournament.order_size ?? 3,
    subCount: tournament.sub_count ?? 1,
    playersPerRound: tournament.players_per_round ?? 3,
    matchFormat: tournament.match_format ?? 'bo3',
    roundsToWin: tournament.rounds_to_win ?? 2,
    blockCount: tournament.block_count ?? 1,
  })
}

/**
 * シリーズIDから設定を取得する。
 */
export async function getLeagueConfig(
  supabase: SupaClient,
  leagueId: string
): Promise<LeagueConfig> {
  const { data: league, error } = await supabase
    .from('leagues')
    .select('league_config')
    .eq('id', leagueId)
    .single()

  if (error || !league) {
    throw new Error(`Series not found: ${leagueId}`)
  }

  return parseLeagueConfig(league.league_config)
}
