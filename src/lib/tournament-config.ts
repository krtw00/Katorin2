import { type SeriesConfig, parseSeriesConfig } from '@/lib/schemas/series-config'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database'

type SupaClient = SupabaseClient<Database>

/**
 * 大会IDからシリーズ or 大会の設定を統一的に取得する。
 * シリーズ配下 → series.series_config
 * 単発大会 → tournaments のカラム
 */
export async function getTournamentConfig(
  supabase: SupaClient,
  tournamentId: string
): Promise<SeriesConfig> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('series_id, order_size, sub_count, players_per_round, win_point_value, block_count, rounds_to_win, match_format')
    .eq('id', tournamentId)
    .single()

  if (error || !tournament) {
    throw new Error(`Tournament not found: ${tournamentId}`)
  }

  if (tournament.series_id) {
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('series_config')
      .eq('id', tournament.series_id)
      .single()

    if (seriesError || !series) {
      throw new Error(`Series not found: ${tournament.series_id}`)
    }

    return parseSeriesConfig(series.series_config)
  }

  // 単発大会: tournaments のカラムから SeriesConfig 互換の形に変換
  return parseSeriesConfig({
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
export async function getSeriesConfig(
  supabase: SupaClient,
  seriesId: string
): Promise<SeriesConfig> {
  const { data: series, error } = await supabase
    .from('series')
    .select('series_config')
    .eq('id', seriesId)
    .single()

  if (error || !series) {
    throw new Error(`Series not found: ${seriesId}`)
  }

  return parseSeriesConfig(series.series_config)
}
