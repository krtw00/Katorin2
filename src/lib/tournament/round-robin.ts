/**
 * 総当たり戦（ラウンドロビン）対戦カード生成
 *
 * WMGP形式:
 * - ブロック別総当たり
 * - 3v3星取戦（2人以上勝利でラウンド勝ち）
 * - 最大3ラウンド、2ラウンド先取で試合勝利
 * - 各マッチはBO3デュエル
 * - 勝ち点: 1勝=3pt, 1敗=0pt
 */

type RoundRobinPairing = {
  team1_id: string
  team2_id: string
  week: number
}

/**
 * 総当たり対戦カード生成
 * チーム数が奇数の場合、各週1チームがBYE
 */
export function generateRoundRobinPairings(teamIds: string[]): RoundRobinPairing[] {
  const teams = [...teamIds]
  const pairings: RoundRobinPairing[] = []

  // 奇数チームの場合、ダミーチーム追加（BYE）
  if (teams.length % 2 === 1) {
    teams.push('BYE')
  }

  const n = teams.length
  const rounds = n - 1

  // 回転式アルゴリズム
  for (let week = 0; week < rounds; week++) {
    for (let i = 0; i < n / 2; i++) {
      const team1 = teams[i]
      const team2 = teams[n - 1 - i]

      // BYEのペアはスキップ
      if (team1 === 'BYE' || team2 === 'BYE') continue

      pairings.push({
        team1_id: team1,
        team2_id: team2,
        week: week + 1,
      })
    }

    // 最初のチーム以外をローテーション
    const last = teams.pop()!
    teams.splice(1, 0, last)
  }

  return pairings
}

/**
 * ブロック分け
 * チームをN個のブロックに振り分ける
 */
export function divideIntoBlocks(
  teamIds: string[],
  blockCount: number
): Map<number, string[]> {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5)
  const blocks = new Map<number, string[]>()

  for (let i = 0; i < blockCount; i++) {
    blocks.set(i, [])
  }

  shuffled.forEach((teamId, index) => {
    const blockIndex = index % blockCount
    blocks.get(blockIndex)!.push(teamId)
  })

  return blocks
}

/**
 * 星取戦（3v3）の勝敗判定
 * 3人中2人以上勝利でラウンド勝ち
 */
export function determineRoundWinner(
  results: { player1Win: boolean }[]
): 'team1' | 'team2' | null {
  if (results.length !== 3) return null

  const team1Wins = results.filter((r) => r.player1Win).length
  const team2Wins = 3 - team1Wins

  if (team1Wins >= 2) return 'team1'
  if (team2Wins >= 2) return 'team2'
  return null
}

/**
 * 試合（最大3ラウンド、2先取）の勝敗判定
 */
export function determineMatchWinner(
  team1RoundWins: number,
  team2RoundWins: number,
  roundsToWin: number = 2
): 'team1' | 'team2' | null {
  if (team1RoundWins >= roundsToWin) return 'team1'
  if (team2RoundWins >= roundsToWin) return 'team2'
  return null
}

/**
 * WMGP勝ち点計算（1勝=3pt, 1敗=0pt）
 */
export function calculateWMGPPoints(isWin: boolean): number {
  return isWin ? 3 : 0
}

/**
 * 没収試合のスコア
 * 両チーム不成立: 1-2 (ラウンド得失点差-1, デュエル得失点差-1)
 * 片方責任: 責任チームのみ敗北
 */
export function getDefaultLossScore(): {
  roundWins: number
  roundLosses: number
  matchWins: number
  matchLosses: number
} {
  return { roundWins: 1, roundLosses: 2, matchWins: 0, matchLosses: 0 }
}

/**
 * 順位決定（6段階タイブレーカー）
 * ①勝ち点 ②ラウンド得失点差 ③マッチ得失点差 ④個人マッチ得失点差 ⑤ラウンド総得点 ⑥直接対決
 */
export type TeamRecord = {
  team_id: string
  win_points: number
  round_diff: number
  match_diff: number
  individual_diff: number
  total_rounds_won: number
}

export function sortByWMGPRanking(records: TeamRecord[]): TeamRecord[] {
  return [...records].sort((a, b) => {
    // ① 勝ち点
    if (a.win_points !== b.win_points) return b.win_points - a.win_points
    // ② ラウンド得失点差
    if (a.round_diff !== b.round_diff) return b.round_diff - a.round_diff
    // ③ マッチ得失点差
    if (a.match_diff !== b.match_diff) return b.match_diff - a.match_diff
    // ④ 個人マッチ得失点差
    if (a.individual_diff !== b.individual_diff) return b.individual_diff - a.individual_diff
    // ⑤ ラウンド総得点
    if (a.total_rounds_won !== b.total_rounds_won) return b.total_rounds_won - a.total_rounds_won
    // ⑥ 直接対決（ここでは未実装、同率とする）
    return 0
  })
}
