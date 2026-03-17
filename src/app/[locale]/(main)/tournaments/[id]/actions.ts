'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

export type MatchReport = {
  winner_id: string
  player1_score: number
  player2_score: number
}

export type ReportMatchResultState = {
  success: boolean
  error?: string
  status?: string // 'pending' | 'agreed' | 'disputed'
}

export async function reportMatchResult(
  matchId: string,
  report: MatchReport
): Promise<ReportMatchResultState> {
  const supabase = await createClient()
  const t = await getTranslations('tournament.actions')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: t('loginRequired') }
  }

  // 試合データ取得
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*, tournament:tournaments!matches_round_id_fkey(result_report_mode, organizer_id)')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    return { success: false, error: t('matchNotFound') }
  }

  // 完了済みチェック
  if (match.status === 'completed') {
    return { success: false, error: t('matchAlreadyConfirmed') }
  }

  // 対戦者かどうか確認
  const isPlayer1 = match.player1_id === user.id
  const isPlayer2 = match.player2_id === user.id
  if (!isPlayer1 && !isPlayer2) {
    return { success: false, error: t('notParticipant') }
  }

  // 報告データ構築
  const reportJson: MatchReport = {
    winner_id: report.winner_id,
    player1_score: report.player1_score,
    player2_score: report.player2_score,
  }

  const updateField = isPlayer1 ? 'player1_report' : 'player2_report'
  const otherReportField = isPlayer1 ? 'player2_report' : 'player1_report'
  const otherReport = match[otherReportField] as MatchReport | null

  // 報告ステータス判定
  let reportStatus: string
  const updateData: Record<string, unknown> = {
    [updateField]: reportJson,
  }

  if (!otherReport) {
    // 相手未報告 → pending
    reportStatus = 'pending'
    updateData.report_status = reportStatus
    updateData.status = 'in_progress'
  } else {
    // 両者報告済み → 一致チェック
    if (
      otherReport.winner_id === reportJson.winner_id &&
      otherReport.player1_score === reportJson.player1_score &&
      otherReport.player2_score === reportJson.player2_score
    ) {
      // 一致 → 自動確定
      reportStatus = 'agreed'
      updateData.report_status = reportStatus
      updateData.player1_score = reportJson.player1_score
      updateData.player2_score = reportJson.player2_score
      updateData.winner_id = reportJson.winner_id
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()
    } else {
      // 不一致 → disputed
      reportStatus = 'disputed'
      updateData.report_status = reportStatus
    }
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 一致確定の場合、次の試合に勝者を進める
  if (reportStatus === 'agreed' && match.next_match_id) {
    const nextField = match.next_match_slot === 1 ? 'player1_id' : 'player2_id'
    await supabase
      .from('matches')
      .update({ [nextField]: reportJson.winner_id })
      .eq('id', match.next_match_id)
  }

  // revalidate
  revalidatePath(`/tournaments/${match.round_id}/bracket`)

  return { success: true, status: reportStatus }
}
