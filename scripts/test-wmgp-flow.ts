/**
 * WMGP形式 全フローテスト
 *
 * npx tsx scripts/test-wmgp-flow.ts
 *
 * テスト:
 *   1. 8チーム(6人)作成 → 2ブロック(4チーム)に分割
 *   2. ブロック内総当たり対戦カード生成（各ブロック6試合）
 *   3. 各試合: オーダー提出(3人+サブ1人)
 *   4. 各試合: 3ラウンド(2先取)× 3v3星取戦 × BO3マッチ
 *   5. 勝ち点(3pt制) + 6段階タイブレーカー順位
 *   6. 決勝進出チーム選出
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Round robin generation (inline)
function generateRoundRobinPairings(teamIds: string[]) {
  const teams = [...teamIds]
  const pairings: { team1_id: string; team2_id: string; week: number }[] = []
  if (teams.length % 2 === 1) teams.push('BYE')
  const n = teams.length
  for (let week = 0; week < n - 1; week++) {
    for (let i = 0; i < n / 2; i++) {
      const t1 = teams[i], t2 = teams[n - 1 - i]
      if (t1 === 'BYE' || t2 === 'BYE') continue
      pairings.push({ team1_id: t1, team2_id: t2, week: week + 1 })
    }
    const last = teams.pop()!
    teams.splice(1, 0, last)
  }
  return pairings
}

let pass = 0, fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++ }
  else { console.error(`  ❌ ${msg}`); fail++ }
}

async function createUser(email: string, name: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: 'test1234', email_confirm: true,
    user_metadata: { display_name: name },
  })
  if (error) throw new Error(`Failed: ${email}: ${error.message}`)
  return data.user.id
}

async function main() {
  console.log('🎮 WMGP形式 全フローテスト')
  console.log('='.repeat(60))

  // ---- Step 1: 8チーム × 6人 ----
  console.log('\n📝 Step 1: 8チーム × 6人作成')
  const teamNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
  const teams: { id: string; name: string; memberIds: string[] }[] = []

  for (let t = 0; t < 8; t++) {
    const memberIds: string[] = []
    for (let m = 0; m < 6; m++) {
      const id = await createUser(`wmgp_t${t}_p${m}@test.com`, `${teamNames[t]}_P${m + 1}`)
      memberIds.push(id)
    }
    const { data: team } = await supabase.from('teams')
      .insert({ name: `Team ${teamNames[t]}`, leader_id: memberIds[0] })
      .select().single()
    await supabase.from('team_members').insert(
      memberIds.map((uid, i) => ({ team_id: team!.id, user_id: uid, role: i === 0 ? 'leader' : 'member' }))
    )
    teams.push({ id: team!.id, name: teamNames[t], memberIds })
  }
  assert(teams.length === 8, '8チーム作成完了')

  // ---- Step 2: 大会作成 + ブロック分け ----
  console.log('\n📝 Step 2: WMGP大会作成 (2ブロック)')
  const { data: tournament } = await supabase.from('tournaments').insert({
    title: 'WMGP Season 8 テスト',
    organizer_id: teams[0].memberIds[0],
    tournament_format: 'round_robin',
    match_format: 'bo3',
    entry_type: 'team',
    max_participants: 64,
    visibility: 'public',
    status: 'recruiting',
    entry_mode: 'open',
    block_count: 2,
    rounds_to_win: 2,
  }).select().single()
  assert(!!tournament, `大会作成成功`)
  const tournamentId = tournament!.id

  // ブロック作成
  const { data: blockA } = await supabase.from('tournament_blocks')
    .insert({ tournament_id: tournamentId, block_name: 'Block A', block_order: 1 })
    .select().single()
  const { data: blockB } = await supabase.from('tournament_blocks')
    .insert({ tournament_id: tournamentId, block_name: 'Block B', block_order: 2 })
    .select().single()
  assert(!!blockA && !!blockB, '2ブロック作成')

  // エントリー + ブロック振分け
  for (let i = 0; i < 8; i++) {
    const blockId = i < 4 ? blockA!.id : blockB!.id
    await supabase.from('team_entries').insert({
      tournament_id: tournamentId, team_id: teams[i].id, block_id: blockId,
    })
  }
  console.log(`  Block A: ${teamNames.slice(0, 4).join(', ')}`)
  console.log(`  Block B: ${teamNames.slice(4).join(', ')}`)

  // ---- Step 3: 総当たり対戦カード生成 ----
  console.log('\n📝 Step 3: 総当たり対戦カード生成')
  const blockATeams = teams.slice(0, 4).map(t => t.id)
  const blockBTeams = teams.slice(4).map(t => t.id)

  const pairingsA = generateRoundRobinPairings(blockATeams)
  const pairingsB = generateRoundRobinPairings(blockBTeams)
  assert(pairingsA.length === 6, `Block A: ${pairingsA.length}/6 試合`)
  assert(pairingsB.length === 6, `Block B: ${pairingsB.length}/6 試合`)

  // ---- Step 4: 各試合実施 ----
  await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', tournamentId)

  // 累計スコア
  const scores = new Map<string, {
    winPoints: number; roundsWon: number; roundsLost: number;
    matchesWon: number; matchesLost: number; individualDiff: number
  }>()
  teams.forEach(t => scores.set(t.id, {
    winPoints: 0, roundsWon: 0, roundsLost: 0,
    matchesWon: 0, matchesLost: 0, individualDiff: 0,
  }))

  async function playWar(
    pairing: { team1_id: string; team2_id: string; week: number },
    blockId: string,
    matchNumber: number
  ) {
    const t1 = teams.find(t => t.id === pairing.team1_id)!
    const t2 = teams.find(t => t.id === pairing.team2_id)!

    // match作成
    const { data: match } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      round: pairing.week,
      match_number: matchNumber,
      team1_id: pairing.team1_id,
      team2_id: pairing.team2_id,
      block_id: blockId,
      status: 'in_progress',
    }).select().single()

    // オーダー提出（3人メイン + 1人サブ）
    for (const team of [t1, t2]) {
      await supabase.from('war_orders').insert(
        team.memberIds.slice(0, 4).map((uid, i) => ({
          match_id: match!.id, team_id: team.id, slot: i + 1,
          user_id: uid, deck_name: `デッキ${i + 1}`, deck_theme: `テーマ${i + 1}`,
          is_sub: i === 3,
        }))
      )
    }

    // 最大3ラウンド（2先取）
    let t1RoundWins = 0, t2RoundWins = 0
    let totalT1MatchWins = 0, totalT2MatchWins = 0
    let totalIndividualDiff = 0

    for (let roundNum = 1; roundNum <= 3; roundNum++) {
      if (t1RoundWins >= 2 || t2RoundWins >= 2) break

      const { data: warRound } = await supabase.from('war_rounds').insert({
        match_id: match!.id, round_number: roundNum, status: 'in_progress',
        started_at: new Date().toISOString(),
      }).select().single()

      // 3v3 星取戦（各マッチはBO3デュエル）
      let roundT1Wins = 0, roundT2Wins = 0

      for (let seat = 0; seat < 3; seat++) {
        const p1Id = t1.memberIds[seat]
        const p2Id = t2.memberIds[seat]

        // BO3デュエル: ランダムに2先取
        const p1DuelWins = Math.random() > 0.45 ? 2 : (Math.random() > 0.5 ? 2 : 1)
        const p2DuelWins = p1DuelWins === 2 ? (Math.random() > 0.5 ? 1 : 0) : 2
        const matchWinner = p1DuelWins > p2DuelWins

        if (matchWinner) { roundT1Wins++; totalT1MatchWins++ }
        else { roundT2Wins++; totalT2MatchWins++ }

        totalIndividualDiff += (p1DuelWins - p2DuelWins)

        await supabase.from('individual_matches').insert({
          match_id: match!.id,
          war_round_id: warRound!.id,
          play_order: (roundNum - 1) * 3 + seat + 1,
          player1_id: p1Id,
          player2_id: p2Id,
          player1_score: p1DuelWins,
          player2_score: p2DuelWins,
          player1_duel_wins: p1DuelWins,
          player2_duel_wins: p2DuelWins,
          winner_id: matchWinner ? p1Id : p2Id,
          status: 'completed',
        })
      }

      // ラウンド勝者（2人以上勝利）
      const roundWinner = roundT1Wins >= 2 ? pairing.team1_id : pairing.team2_id
      if (roundT1Wins >= 2) t1RoundWins++
      else t2RoundWins++

      await supabase.from('war_rounds').update({
        team1_match_wins: roundT1Wins,
        team2_match_wins: roundT2Wins,
        winner_team_id: roundWinner,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', warRound!.id)
    }

    // 試合勝者
    const matchWinnerId = t1RoundWins >= 2 ? pairing.team1_id : pairing.team2_id
    await supabase.from('matches').update({
      team1_round_wins: t1RoundWins,
      team2_round_wins: t2RoundWins,
      team1_wins: totalT1MatchWins,
      team2_wins: totalT2MatchWins,
      winner_team_id: matchWinnerId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', match!.id)

    // スコア累計
    const s1 = scores.get(pairing.team1_id)!
    s1.winPoints += matchWinnerId === pairing.team1_id ? 3 : 0
    s1.roundsWon += t1RoundWins; s1.roundsLost += t2RoundWins
    s1.matchesWon += totalT1MatchWins; s1.matchesLost += totalT2MatchWins
    s1.individualDiff += totalIndividualDiff

    const s2 = scores.get(pairing.team2_id)!
    s2.winPoints += matchWinnerId === pairing.team2_id ? 3 : 0
    s2.roundsWon += t2RoundWins; s2.roundsLost += t1RoundWins
    s2.matchesWon += totalT2MatchWins; s2.matchesLost += totalT1MatchWins
    s2.individualDiff -= totalIndividualDiff

    const winnerName = matchWinnerId === pairing.team1_id ? t1.name : t2.name
    console.log(`    ${t1.name} ${t1RoundWins}-${t2RoundWins} ${t2.name} → ${winnerName}勝利 (個人マッチ ${totalT1MatchWins}-${totalT2MatchWins})`)
  }

  // Block A 総当たり実施
  console.log('\n🏆 Block A 総当たり')
  for (let i = 0; i < pairingsA.length; i++) {
    await playWar(pairingsA[i], blockA!.id, i + 1)
  }

  // Block B 総当たり実施（match_numberをオフセット）
  console.log('\n🏆 Block B 総当たり')
  for (let i = 0; i < pairingsB.length; i++) {
    await playWar(pairingsB[i], blockB!.id, pairingsA.length + i + 1)
  }

  // ---- Step 5: 順位確認 ----
  console.log('\n📊 Block A 順位:')
  const blockAScores = teams.slice(0, 4).map(t => ({
    name: t.name, ...scores.get(t.id)!,
  })).sort((a, b) => {
    if (a.winPoints !== b.winPoints) return b.winPoints - a.winPoints
    const aDiff = a.roundsWon - a.roundsLost, bDiff = b.roundsWon - b.roundsLost
    if (aDiff !== bDiff) return bDiff - aDiff
    const aMDiff = a.matchesWon - a.matchesLost, bMDiff = b.matchesWon - b.matchesLost
    return bMDiff - aMDiff
  })
  blockAScores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name.padEnd(10)} 勝点:${s.winPoints} ラウンド:${s.roundsWon}-${s.roundsLost}(${s.roundsWon - s.roundsLost >= 0 ? '+' : ''}${s.roundsWon - s.roundsLost}) マッチ:${s.matchesWon}-${s.matchesLost}`)
  })

  console.log('\n📊 Block B 順位:')
  const blockBScores = teams.slice(4).map(t => ({
    name: t.name, ...scores.get(t.id)!,
  })).sort((a, b) => {
    if (a.winPoints !== b.winPoints) return b.winPoints - a.winPoints
    const aDiff = a.roundsWon - a.roundsLost, bDiff = b.roundsWon - b.roundsLost
    return bDiff - aDiff
  })
  blockBScores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name.padEnd(10)} 勝点:${s.winPoints} ラウンド:${s.roundsWon}-${s.roundsLost}(${s.roundsWon - s.roundsLost >= 0 ? '+' : ''}${s.roundsWon - s.roundsLost}) マッチ:${s.matchesWon}-${s.matchesLost}`)
  })

  // ---- Step 6: block_standings ビュー確認 ----
  console.log('\n📝 block_standings ビュー確認')
  const { data: standings } = await supabase
    .from('block_standings')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })

  assert(standings?.length === 8, `ランキング: ${standings?.length}/8チーム`)

  if (standings) {
    const blockAStandings = standings.filter(s => s.block_id === blockA!.id)
    const blockBStandings = standings.filter(s => s.block_id === blockB!.id)

    console.log('\n  Block A (DB):')
    blockAStandings.forEach(s => {
      console.log(`    ${s.rank}. ${String(s.team_name).padEnd(15)} 勝点:${s.total_win_points} ラウンド差:${s.round_diff} マッチ差:${s.match_diff} 勝:${s.wins} 敗:${s.losses}`)
    })
    console.log('  Block B (DB):')
    blockBStandings.forEach(s => {
      console.log(`    ${s.rank}. ${String(s.team_name).padEnd(15)} 勝点:${s.total_win_points} ラウンド差:${s.round_diff} マッチ差:${s.match_diff} 勝:${s.wins} 敗:${s.losses}`)
    })

    // 各ブロック1位確認
    assert(blockAStandings[0]?.rank === 1, `Block A 1位あり`)
    assert(blockBStandings[0]?.rank === 1, `Block B 1位あり`)
  }

  // ---- Step 7: war_rounds 確認 ----
  console.log('\n📝 war_rounds データ確認')
  const { data: warRounds } = await supabase.from('war_rounds').select('*').limit(5)
  assert((warRounds?.length || 0) > 0, `war_rounds にデータあり (${warRounds?.length}件)`)

  // ---- Step 8: individual_matches 確認 ----
  const { data: indMatches, count } = await supabase.from('individual_matches')
    .select('*', { count: 'exact', head: true })
  assert((count || 0) > 0, `individual_matches にデータあり (${count}件)`)

  // 完了
  await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 結果: ${pass} passed, ${fail} failed`)
  console.log('='.repeat(60))
  if (fail > 0) process.exit(1)
}

main().catch(err => { console.error('\n💥 Fatal:', err); process.exit(1) })
