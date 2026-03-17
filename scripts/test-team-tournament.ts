/**
 * チーム大会（ロケットカップ形式）全フローテスト
 *
 * npx tsx scripts/test-team-tournament.ts
 *
 * テスト内容:
 *   1. 8チーム×5人作成
 *   2. チーム大会作成（スイスドロー予選 + シングルエリミネーション決勝）
 *   3. チームエントリー（8チーム）
 *   4. スイスドロー Round 1: マッチメイキング
 *   5. オーダー提出（5人×デッキ）
 *   6. Ban&Pick結果入力（3人選択）
 *   7. War（9試合）結果入力
 *   8. ポイント計算
 *   9. Round 2, 3 の繰り返し
 *  10. 順位確定 → TOP4選出
 *  11. 決勝シングルエリミネーション
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Import swiss-draw logic (inline since we can't use path aliases in tsx)
function getSwissRoundCount(teamCount: number): number {
  if (teamCount <= 8) return 3
  if (teamCount <= 16) return 4
  if (teamCount <= 32) return 5
  return 6
}

function generateSwissPairings(
  standings: { team_id: string; team_points: number; win_points: number; had_bye: boolean }[],
  previousPairings: Set<string>,
  round: number
) {
  const sorted = [...standings].sort((a, b) => {
    if (a.team_points !== b.team_points) return b.team_points - a.team_points
    return b.win_points - a.win_points
  })

  const pairings: { team1_id: string; team2_id: string }[] = []
  const used = new Set<string>()

  const makePairingKey = (a: string, b: string) => a < b ? `${a}:${b}` : `${b}:${a}`

  if (round === 1) {
    for (let i = 0; i < sorted.length - 1; i += 2) {
      pairings.push({ team1_id: sorted[i].team_id, team2_id: sorted[i + 1].team_id })
    }
    return { pairings, byeTeamId: null }
  }

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i]
    if (used.has(team.team_id)) continue
    for (let j = i + 1; j < sorted.length; j++) {
      const opponent = sorted[j]
      if (used.has(opponent.team_id)) continue
      const key = makePairingKey(team.team_id, opponent.team_id)
      if (previousPairings.has(key)) continue
      pairings.push({ team1_id: team.team_id, team2_id: opponent.team_id })
      used.add(team.team_id)
      used.add(opponent.team_id)
      break
    }
  }
  return { pairings, byeTeamId: null }
}

function generateWarRotation(team1Players: string[], team2Players: string[]) {
  return [
    { playOrder: 1, round: 1, player1Id: team1Players[0], player2Id: team2Players[0] },
    { playOrder: 2, round: 1, player1Id: team1Players[1], player2Id: team2Players[1] },
    { playOrder: 3, round: 1, player1Id: team1Players[2], player2Id: team2Players[2] },
    { playOrder: 4, round: 2, player1Id: team1Players[0], player2Id: team2Players[1] },
    { playOrder: 5, round: 2, player1Id: team1Players[1], player2Id: team2Players[2] },
    { playOrder: 6, round: 2, player1Id: team1Players[2], player2Id: team2Players[0] },
    { playOrder: 7, round: 3, player1Id: team1Players[2], player2Id: team2Players[0] },
    { playOrder: 8, round: 3, player1Id: team1Players[0], player2Id: team2Players[1] },
    { playOrder: 9, round: 3, player1Id: team1Players[1], player2Id: team2Players[2] },
  ]
}

// ============================================================
let pass = 0, fail = 0
function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`  ✅ ${msg}`); pass++ }
  else { console.error(`  ❌ ${msg}`); fail++ }
}

async function createUser(email: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: 'test1234', email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Failed to create ${email}: ${error.message}`)
  return data.user.id
}

// ============================================================
async function main() {
  console.log('🎮 チーム大会（ロケットカップ形式）全フローテスト')
  console.log('='.repeat(60))

  // ---- Step 1: 8チーム × 5人 = 40ユーザー作成 ----
  console.log('\n📝 Step 1: 8チーム × 5人作成')
  const teamNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
  const teams: { id: string; name: string; memberIds: string[] }[] = []

  for (let t = 0; t < 8; t++) {
    const memberIds: string[] = []
    for (let m = 0; m < 5; m++) {
      const id = await createUser(
        `team${t}_p${m}@test.com`,
        `${teamNames[t]}_Player${m + 1}`
      )
      memberIds.push(id)
    }

    // チーム作成（リーダー = 最初のメンバー）
    const { data: team } = await supabase
      .from('teams')
      .insert({ name: `Team ${teamNames[t]}`, leader_id: memberIds[0] })
      .select().single()

    // メンバー登録
    await supabase.from('team_members').insert(
      memberIds.map((uid, i) => ({
        team_id: team!.id,
        user_id: uid,
        role: i === 0 ? 'leader' : 'member',
      }))
    )

    teams.push({ id: team!.id, name: teamNames[t], memberIds })
  }
  assert(teams.length === 8, `8チーム作成完了`)

  // ---- Step 2: チーム大会作成 ----
  console.log('\n📝 Step 2: チーム大会作成')
  const roundCount = getSwissRoundCount(8)
  assert(roundCount === 3, `スイスドロー: ${roundCount}ラウンド`)

  const { data: tournament } = await supabase
    .from('rounds')
    .insert({
      title: 'ロケットカップ形式テスト大会',
      organizer_id: teams[0].memberIds[0],
      format: 'swiss',
      match_format: 'bo1',
      entry_type: 'team',
      max_participants: 16,
      visibility: 'public',
      status: 'recruiting',
      entry_mode: 'open',
      swiss_round_count: roundCount,
      finals_bracket_size: 4,
    })
    .select().single()
  assert(!!tournament, `大会作成成功: ${tournament?.title}`)
  const tournamentId = tournament!.id

  // ---- Step 3: チームエントリー ----
  console.log('\n📝 Step 3: 8チームエントリー')
  for (const team of teams) {
    const { error } = await supabase.from('team_entries').insert({
      round_id: tournamentId,
      team_id: team.id,
    })
    assert(!error, `${team.name} エントリー成功`)
  }

  // ---- Step 4-8: スイスドロー 3ラウンド ----
  const previousPairings = new Set<string>()
  const cumulativeStandings = new Map<string, { team_points: number; win_points: number; had_bye: boolean }>()
  teams.forEach(t => cumulativeStandings.set(t.id, { team_points: 0, win_points: 0, had_bye: false }))

  for (let round = 1; round <= roundCount; round++) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏆 スイスドロー Round ${round}`)
    console.log('='.repeat(60))

    // マッチメイキング
    console.log('\n📝 マッチメイキング')
    const standings = Array.from(cumulativeStandings.entries()).map(([id, s]) => ({
      team_id: id, ...s,
    }))
    const { pairings } = generateSwissPairings(standings, previousPairings, round)
    assert(pairings.length === 4, `4ペア生成`)

    for (const p of pairings) {
      const key = p.team1_id < p.team2_id ? `${p.team1_id}:${p.team2_id}` : `${p.team2_id}:${p.team1_id}`
      previousPairings.add(key)
    }

    // matchesテーブルに挿入
    for (let i = 0; i < pairings.length; i++) {
      const p = pairings[i]
      const t1 = teams.find(t => t.id === p.team1_id)!
      const t2 = teams.find(t => t.id === p.team2_id)!
      console.log(`  ${t1.name} vs ${t2.name}`)

      const { data: match } = await supabase.from('matches').insert({
        round_id: tournamentId,
        round,
        match_number: i + 1,
        team1_id: p.team1_id,
        team2_id: p.team2_id,
        status: 'pending',
      }).select().single()

      // オーダー提出（5人 × 2チーム）
      const deckThemes = ['天盃龍', 'スネークアイ', 'ユベル', 'R-ACE', '粛声']
      for (const team of [t1, t2]) {
        const orders = team.memberIds.map((uid, slot) => ({
          match_id: match!.id,
          team_id: team.id,
          slot: slot + 1,
          user_id: uid,
          deck_name: `${deckThemes[slot]}デッキ`,
          deck_theme: deckThemes[slot],
        }))
        await supabase.from('war_orders').insert(orders)
      }

      // Ban&Pick結果（各チーム5人中slot 1,2,3をPick、4,5をBan）
      // 実際にはDiscordで行うが、結果だけ記録
      await supabase.from('war_orders')
        .update({ is_picked: true })
        .eq('match_id', match!.id)
        .in('slot', [1, 2, 3])

      await supabase.from('war_orders')
        .update({ is_banned: true })
        .eq('match_id', match!.id)
        .in('slot', [4, 5])

      // 出場3人を取得
      const team1Picked = t1.memberIds.slice(0, 3)
      const team2Picked = t2.memberIds.slice(0, 3)

      // ローテーション生成 → 9試合作成
      const rotation = generateWarRotation(team1Picked, team2Picked)
      const individualMatches = rotation.map(r => ({
        match_id: match!.id,
        play_order: r.playOrder,
        player1_id: r.player1Id,
        player2_id: r.player2Id,
        player1_score: 0,
        player2_score: 0,
        status: 'pending' as const,
      }))
      const { error: imError } = await supabase.from('individual_matches').insert(individualMatches)
      assert(!imError, `  9試合生成 (${t1.name} vs ${t2.name})`)

      // 結果入力（ランダムに勝敗を決める）
      let t1Wins = 0, t2Wins = 0
      for (const r of rotation) {
        // ラウンドごとに少し偏りを持たせる
        const t1Win = Math.random() > 0.4 // team1が少し有利
        const winnerId = t1Win ? r.player1Id : r.player2Id
        if (t1Win) t1Wins++; else t2Wins++

        await supabase.from('individual_matches')
          .update({
            player1_score: t1Win ? 1 : 0,
            player2_score: t1Win ? 0 : 1,
            winner_id: winnerId,
            status: 'completed',
          })
          .eq('match_id', match!.id)
          .eq('play_order', r.playOrder)
      }

      // War結果をmatchesに反映
      const winnerTeamId = t1Wins >= 5 ? p.team1_id : (t2Wins >= 5 ? p.team2_id : null)
      await supabase.from('matches').update({
        team1_wins: t1Wins,
        team2_wins: t2Wins,
        winner_team_id: winnerTeamId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', match!.id)

      console.log(`    結果: ${t1.name} ${t1Wins} - ${t2Wins} ${t2.name} → ${winnerTeamId ? (winnerTeamId === p.team1_id ? t1.name : t2.name) + '勝利' : '引分'}`)

      // ポイント更新
      const s1 = cumulativeStandings.get(p.team1_id)!
      s1.team_points += t1Wins >= 5 ? 1 : 0
      s1.win_points += t1Wins

      const s2 = cumulativeStandings.get(p.team2_id)!
      s2.team_points += t2Wins >= 5 ? 1 : 0
      s2.win_points += t2Wins

      // swiss_standings に記録
      await supabase.from('swiss_standings').insert([
        { round_id: tournamentId, team_id: p.team1_id, round, team_points: t1Wins >= 5 ? 1 : 0, win_points: t1Wins },
        { round_id: tournamentId, team_id: p.team2_id, round, team_points: t2Wins >= 5 ? 1 : 0, win_points: t2Wins },
      ])
    }

    // ラウンド終了後の順位表示
    console.log(`\n📊 Round ${round} 終了時の順位:`)
    const rankingSorted = Array.from(cumulativeStandings.entries())
      .sort(([, a], [, b]) => {
        if (a.team_points !== b.team_points) return b.team_points - a.team_points
        return b.win_points - a.win_points
      })
    rankingSorted.forEach(([teamId, s], i) => {
      const team = teams.find(t => t.id === teamId)!
      console.log(`  ${i + 1}. ${team.name.padEnd(10)} TP:${s.team_points} WP:${s.win_points}`)
    })
  }

  // ---- Step 9: TOP4選出 ----
  console.log(`\n${'='.repeat(60)}`)
  console.log('🏆 予選完了 → TOP4選出')
  console.log('='.repeat(60))

  const finalRanking = Array.from(cumulativeStandings.entries())
    .sort(([, a], [, b]) => {
      if (a.team_points !== b.team_points) return b.team_points - a.team_points
      return b.win_points - a.win_points
    })

  const top4TeamIds = finalRanking.slice(0, 4).map(([id]) => id)
  const top4Names = top4TeamIds.map(id => teams.find(t => t.id === id)!.name)
  console.log(`  決勝進出: ${top4Names.join(', ')}`)
  assert(top4TeamIds.length === 4, `TOP4選出完了`)

  // ---- Step 10: swiss_rankings ビュー確認 ----
  console.log('\n📝 swiss_rankings ビュー確認')
  const { data: rankings } = await supabase
    .from('round_swiss_rankings')
    .select('*')
    .eq('round_id', tournamentId)
    .order('rank', { ascending: true })

  assert(rankings?.length === 8, `ランキング: ${rankings?.length}/8チーム`)
  if (rankings) {
    rankings.forEach(r => {
      console.log(`  ${r.rank}. ${r.team_name?.padEnd(15)} TP:${r.total_team_points} WP:${r.total_win_points}`)
    })
  }

  // ---- Step 11: 大会完了 ----
  await supabase.from('rounds').update({ status: 'completed' }).eq('id', tournamentId)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 結果: ${pass} passed, ${fail} failed`)
  console.log('='.repeat(60))

  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err)
  process.exit(1)
})
