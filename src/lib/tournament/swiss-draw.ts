/**
 * スイスドロー対戦カード生成 & ポイント計算
 *
 * ロケットカップ形式:
 * - War = 1チーム vs 1チーム（3Round × 3試合 = 9試合）
 * - チームポイント: 5勝以上で+1
 * - 勝ち点: 勝利数分
 * - 不戦勝: 5-4扱い（TP+1, WP+5）
 * - 不戦敗: 4-5扱い（WP+4）
 */

export type TeamStanding = {
  team_id: string
  team_points: number
  win_points: number
  had_bye: boolean
}

type Pairing = {
  team1_id: string
  team2_id: string
}

/**
 * チーム数からスイスドローのラウンド数を決定
 */
export function getSwissRoundCount(teamCount: number): number {
  if (teamCount <= 8) return 3
  if (teamCount <= 16) return 4
  if (teamCount <= 32) return 5
  return 6
}

/**
 * スイスドロー対戦カード生成
 *
 * @param standings 現在の順位（TP→WP降順ソート済み）
 * @param previousPairings 過去の対戦ペア Set<"id1:id2">（id1 < id2）
 * @param round 現在のラウンド番号
 * @returns 対戦カード配列 + BYEチームID（奇数チームの場合）
 */
export function generateSwissPairings(
  standings: TeamStanding[],
  previousPairings: Set<string>,
  round: number
): { pairings: Pairing[]; byeTeamId: string | null } {
  // 1. ソート（TP降順 → WP降順）
  const sorted = [...standings].sort((a, b) => {
    if (a.team_points !== b.team_points) return b.team_points - a.team_points
    return b.win_points - a.win_points
  })

  let byeTeamId: string | null = null

  // 2. 奇数チームの場合、最下位でBYE未経験のチームにBYEを付与
  if (sorted.length % 2 === 1) {
    // 下から探してBYE未経験チームを見つける
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!sorted[i].had_bye) {
        byeTeamId = sorted[i].team_id
        sorted.splice(i, 1)
        break
      }
    }
    // 全チームBYE経験済みなら最下位にBYE
    if (!byeTeamId && sorted.length % 2 === 1) {
      byeTeamId = sorted[sorted.length - 1].team_id
      sorted.pop()
    }
  }

  // 3. ペアリング
  const pairings: Pairing[] = []
  const used = new Set<string>()

  function makePairingKey(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`
  }

  // Round 1: ランダム
  if (round === 1) {
    const shuffled = [...sorted].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push({
        team1_id: shuffled[i].team_id,
        team2_id: shuffled[i + 1].team_id,
      })
    }
    return { pairings, byeTeamId }
  }

  // Round 2+: 上位から順にペアリング、対戦済み回避
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i]
    if (used.has(team.team_id)) continue

    // 最も近い順位で未対戦のチームを探す
    let paired = false
    for (let j = i + 1; j < sorted.length; j++) {
      const opponent = sorted[j]
      if (used.has(opponent.team_id)) continue

      const key = makePairingKey(team.team_id, opponent.team_id)
      if (previousPairings.has(key)) continue

      pairings.push({
        team1_id: team.team_id,
        team2_id: opponent.team_id,
      })
      used.add(team.team_id)
      used.add(opponent.team_id)
      paired = true
      break
    }

    // 対戦済み回避できなかった場合、仕方なく最も近い未使用チームとペア
    if (!paired) {
      for (let j = i + 1; j < sorted.length; j++) {
        const opponent = sorted[j]
        if (used.has(opponent.team_id)) continue

        pairings.push({
          team1_id: team.team_id,
          team2_id: opponent.team_id,
        })
        used.add(team.team_id)
        used.add(opponent.team_id)
        break
      }
    }
  }

  return { pairings, byeTeamId }
}

/**
 * War結果からチームポイントと勝ち点を計算
 *
 * @param team1Wins チーム1の勝利数（9試合中）
 * @param team2Wins チーム2の勝利数（9試合中）
 * @returns 各チームのTP/WP
 */
export function calculateWarPoints(team1Wins: number, team2Wins: number): {
  team1: { teamPoints: number; winPoints: number }
  team2: { teamPoints: number; winPoints: number }
} {
  return {
    team1: {
      teamPoints: team1Wins >= 5 ? 1 : 0,
      winPoints: team1Wins,
    },
    team2: {
      teamPoints: team2Wins >= 5 ? 1 : 0,
      winPoints: team2Wins,
    },
  }
}

/**
 * BYEのポイント（不戦勝: 5-4扱い）
 */
export function getByePoints(): { teamPoints: number; winPoints: number } {
  return { teamPoints: 1, winPoints: 5 }
}

/**
 * 3Round × 3試合のローテーション対戦表を生成
 *
 * Ban&Pick後に確定した3人の出場順序から9試合の組み合わせを生成
 * ルール:
 *   Round 1: Pick順通り (1v1, 2v2, 3v3)
 *   Round 2: 後手チーム(team2)が1つ下にシフト (1v2, 2v3, 3v1)
 *   Round 3: 先手チーム(team1)が1つ上にシフト (3v1, 1v2, 2v3) → = (1v3, 2v1, 3v2)
 *
 * @param team1Players 先手チームの出場者3名（pick順）
 * @param team2Players 後手チームの出場者3名（pick順）
 */
export function generateWarRotation(
  team1Players: string[],
  team2Players: string[]
): { playOrder: number; round: number; seatNumber: number; player1Id: string; player2Id: string }[] {
  if (team1Players.length !== 3 || team2Players.length !== 3) {
    throw new Error('Each team must have exactly 3 players')
  }

  return [
    // Round 1: そのまま
    { playOrder: 1, round: 1, seatNumber: 1, player1Id: team1Players[0], player2Id: team2Players[0] },
    { playOrder: 2, round: 1, seatNumber: 2, player1Id: team1Players[1], player2Id: team2Players[1] },
    { playOrder: 3, round: 1, seatNumber: 3, player1Id: team1Players[2], player2Id: team2Players[2] },
    // Round 2: team2が1つ下にシフト
    { playOrder: 4, round: 2, seatNumber: 1, player1Id: team1Players[0], player2Id: team2Players[1] },
    { playOrder: 5, round: 2, seatNumber: 2, player1Id: team1Players[1], player2Id: team2Players[2] },
    { playOrder: 6, round: 2, seatNumber: 3, player1Id: team1Players[2], player2Id: team2Players[0] },
    // Round 3: team1が1つ上にシフト
    { playOrder: 7, round: 3, seatNumber: 1, player1Id: team1Players[2], player2Id: team2Players[0] },
    { playOrder: 8, round: 3, seatNumber: 2, player1Id: team1Players[0], player2Id: team2Players[1] },
    { playOrder: 9, round: 3, seatNumber: 3, player1Id: team1Players[1], player2Id: team2Players[2] },
  ]
}

/**
 * 決勝進出チームの選出
 *
 * 順位決定:
 * 1. チームポイント合計（降順）
 * 2. 勝ち点合計（降順）
 * 3. 同率の場合は直接対決（ここでは未実装、運営判断）
 */
export function selectFinalists(
  standings: { team_id: string; total_team_points: number; total_win_points: number }[],
  count: number = 4
): string[] {
  const sorted = [...standings].sort((a, b) => {
    if (a.total_team_points !== b.total_team_points) {
      return b.total_team_points - a.total_team_points
    }
    return b.total_win_points - a.total_win_points
  })

  return sorted.slice(0, count).map((s) => s.team_id)
}
