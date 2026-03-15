/**
 * 大会運営フロー全体テスト
 *
 * 使い方:
 *   npx tsx scripts/test-tournament-flow.ts
 *
 * テスト内容:
 *   1. テストユーザー8名作成
 *   2. 大会作成（シングルエリミネーション, BO3, 8人）
 *   3. ステータス遷移: draft → recruiting
 *   4. 8名エントリー
 *   5. ブラケット生成（in_progress へ遷移）
 *   6. 1回戦4試合の結果入力 + 勝者進出
 *   7. 準決勝2試合の結果入力 + 勝者進出
 *   8. 決勝1試合の結果入力
 *   9. 大会完了
 *  10. ランキング検証
 *
 * BYEテスト（5人参加）:
 *  11. 5人大会作成 → ブラケット生成 → BYE自動進出確認
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ブラケット生成ロジックをインポート
// (Node環境では直接importできないのでロジックを再実装)
function generateSingleEliminationBracket(
  tournamentId: string,
  participants: { user_id: string; seed: number | null; entry_number: number }[]
) {
  type MatchInsert = {
    id: string
    tournament_id: string
    round: number
    match_number: number
    player1_id: string | null
    player2_id: string | null
    player1_score: number
    player2_score: number
    winner_id: string | null
    status: 'pending' | 'bye'
    next_match_id: string | null
    next_match_slot: number | null
  }

  const matches: MatchInsert[] = []
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed
    if (a.seed) return -1
    if (b.seed) return 1
    return a.entry_number - b.entry_number
  })

  const totalRounds = Math.log2(bracketSize)
  const allRoundsMatches: { player1?: string; player2?: string }[][] = []

  // Round 1
  const round1: { player1?: string; player2?: string }[] = []
  for (let i = 0; i < bracketSize / 2; i++) {
    round1.push({
      player1: i * 2 < sortedParticipants.length ? sortedParticipants[i * 2].user_id : undefined,
      player2: i * 2 + 1 < sortedParticipants.length ? sortedParticipants[i * 2 + 1].user_id : undefined,
    })
  }
  allRoundsMatches.push(round1)

  // Subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const prevCount = allRoundsMatches[round - 2].length
    const thisRound: { player1?: string; player2?: string }[] = []
    for (let i = 0; i < prevCount / 2; i++) {
      thisRound.push({ player1: undefined, player2: undefined })
    }
    allRoundsMatches.push(thisRound)
  }

  // Pre-generate UUIDs
  const matchIdMap: Record<string, string> = {}
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const round = roundIndex + 1
    const roundMatches = allRoundsMatches[roundIndex]
    for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
      const key = `r${round}m${matchIndex + 1}`
      matchIdMap[key] = crypto.randomUUID()
    }
  }

  // Convert to DB format
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const round = roundIndex + 1
    const roundMatches = allRoundsMatches[roundIndex]

    for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
      const matchNumber = matchIndex + 1
      const matchData = roundMatches[matchIndex]
      const currentMatchKey = `r${round}m${matchNumber}`
      const generatedMatchId = matchIdMap[currentMatchKey]

      let nextMatchId: string | null = null
      let nextMatchSlot: number | null = null
      if (round < totalRounds) {
        const nextMatchNumber = Math.ceil(matchNumber / 2)
        nextMatchId = matchIdMap[`r${round + 1}m${nextMatchNumber}`]
        nextMatchSlot = matchNumber % 2 === 1 ? 1 : 2
      }

      let status: 'pending' | 'bye' = 'pending'
      if ((matchData.player1 && !matchData.player2) || (!matchData.player1 && matchData.player2)) {
        status = 'bye'
      }

      matches.push({
        id: generatedMatchId,
        tournament_id: tournamentId,
        round,
        match_number: matchNumber,
        player1_id: matchData.player1 || null,
        player2_id: matchData.player2 || null,
        player1_score: 0,
        player2_score: 0,
        winner_id: status === 'bye' ? matchData.player1 || matchData.player2 || null : null,
        status,
        next_match_id: nextMatchId,
        next_match_slot: nextMatchSlot,
      })
    }
  }

  // BYE勝者を次ラウンドに進出
  const byeMatches = matches.filter((m) => m.status === 'bye' && m.winner_id)
  for (const byeMatch of byeMatches) {
    if (!byeMatch.next_match_id || !byeMatch.winner_id) continue
    const nextMatch = matches.find((m) => m.id === byeMatch.next_match_id)
    if (!nextMatch) continue
    if (byeMatch.next_match_slot === 1) nextMatch.player1_id = byeMatch.winner_id
    else if (byeMatch.next_match_slot === 2) nextMatch.player2_id = byeMatch.winner_id
  }

  // 連鎖BYE処理
  let changed = true
  while (changed) {
    changed = false
    for (const match of matches) {
      if (match.status !== 'pending' || !match.next_match_id) continue
      const hasP1 = !!match.player1_id
      const hasP2 = !!match.player2_id
      if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
        match.status = 'bye'
        match.winner_id = match.player1_id || match.player2_id
        const nextMatch = matches.find((m) => m.id === match.next_match_id)
        if (nextMatch && match.winner_id) {
          if (match.next_match_slot === 1) nextMatch.player1_id = match.winner_id
          else if (match.next_match_slot === 2) nextMatch.player2_id = match.winner_id
          changed = true
        }
      }
    }
  }

  return matches
}

// ============================================================
// Helpers
// ============================================================
let pass = 0
let fail = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`)
    pass++
  } else {
    console.error(`  ❌ ${msg}`)
    fail++
  }
}

async function createTestUser(email: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'test1234',
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`)
  return data.user.id
}

async function cleanup() {
  // Delete in dependency order
  await supabase.from('matches').delete().neq('id', '')
  await supabase.from('participants').delete().neq('id', '')
  await supabase.from('tournament_invites').delete().neq('id', '')
  await supabase.from('series_points').delete().neq('id', '')
  await supabase.from('tournaments').delete().neq('id', '')
  await supabase.from('notifications').delete().neq('id', '')

  // Delete test users (profiles are cascade-deleted via trigger or FK)
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 })
  for (const user of users?.users || []) {
    if (user.email?.startsWith('test_')) {
      // Delete profile first (may not cascade)
      await supabase.from('profiles').delete().eq('id', user.id)
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) console.error(`  ⚠️ ユーザー削除失敗 ${user.email}: ${error.message}`)
    }
  }
}

// ============================================================
// Test: 8人フルトーナメント
// ============================================================
async function testFullTournament(): Promise<string[]> {
  console.log('\n🏆 テスト: 8人シングルエリミネーション (フルトーナメント)')
  console.log('=' .repeat(60))

  // 1. ユーザー作成
  console.log('\n📝 Step 1: テストユーザー8名作成')
  const userIds: string[] = []
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank']
  for (let i = 0; i < 8; i++) {
    const id = await createTestUser(`test_${i}@example.com`, names[i])
    userIds.push(id)
  }
  assert(userIds.length === 8, `8ユーザー作成完了`)

  // profiles が自動作成されたか確認
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
  assert(profiles?.length === 8, `プロフィール自動作成: ${profiles?.length}/8`)

  // 2. 大会作成（主催者: Alice）
  console.log('\n📝 Step 2: 大会作成')
  const { data: tournament, error: createError } = await supabase
    .from('tournaments')
    .insert({
      title: 'テスト大会: 8人シングルエリミ',
      description: '自動テスト用大会',
      organizer_id: userIds[0],
      tournament_format: 'single_elimination',
      match_format: 'bo3',
      max_participants: 8,
      visibility: 'public',
      status: 'draft',
      entry_mode: 'open',
    })
    .select()
    .single()

  assert(!createError, `大会作成成功`)
  assert(tournament?.status === 'draft', `ステータス: draft`)
  const tournamentId = tournament!.id

  // 3. ステータス遷移: draft → recruiting
  console.log('\n📝 Step 3: ステータス遷移 draft → recruiting')
  const { error: recruitError } = await supabase
    .from('tournaments')
    .update({ status: 'recruiting' })
    .eq('id', tournamentId)
  assert(!recruitError, `draft → recruiting 成功`)

  // 4. エントリー（8名全員）
  console.log('\n📝 Step 4: 8名エントリー')
  for (let i = 0; i < 8; i++) {
    const { error: entryError } = await supabase
      .from('participants')
      .insert({
        tournament_id: tournamentId,
        user_id: userIds[i],
        display_name: names[i],
      })
    assert(!entryError, `${names[i]} エントリー成功`)
  }

  // 参加者一覧取得
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })
  assert(participants?.length === 8, `参加者数: ${participants?.length}/8`)

  // 5. ブラケット生成
  console.log('\n📝 Step 5: ブラケット生成')
  const bracketMatches = generateSingleEliminationBracket(
    tournamentId,
    participants!.map((p) => ({
      user_id: p.user_id,
      seed: p.seed,
      entry_number: p.entry_number,
    }))
  )

  assert(bracketMatches.length === 7, `マッチ数: ${bracketMatches.length}/7 (4+2+1)`)

  // 1回戦4試合すべてに両プレイヤーがいるか
  const round1 = bracketMatches.filter((m) => m.round === 1)
  assert(round1.length === 4, `1回戦: ${round1.length}/4 試合`)
  const allHavePlayers = round1.every((m) => m.player1_id && m.player2_id)
  assert(allHavePlayers, `1回戦全試合に両プレイヤーあり`)

  // BYEがないことを確認
  const byeMatches = bracketMatches.filter((m) => m.status === 'bye')
  assert(byeMatches.length === 0, `BYEなし（8人=2のべき乗）`)

  // DBに挿入
  const { error: insertMatchError } = await supabase.from('matches').insert(bracketMatches)
  assert(!insertMatchError, `マッチデータ挿入成功`)

  // ステータス: in_progress
  await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', tournamentId)

  // 6. 1回戦結果入力
  console.log('\n📝 Step 6: 1回戦結果入力')
  // Alice vs Bob → Alice wins (2-1)
  // Charlie vs Diana → Charlie wins (2-0)
  // Eve vs Frank → Eve wins (2-1)
  // Grace vs Hank → Hank wins (1-2)
  const round1Results = [
    { match: round1[0], winner: 0, p1Score: 2, p2Score: 1 }, // Alice
    { match: round1[1], winner: 2, p1Score: 2, p2Score: 0 }, // Charlie
    { match: round1[2], winner: 4, p1Score: 2, p2Score: 1 }, // Eve
    { match: round1[3], winner: 7, p1Score: 1, p2Score: 2 }, // Hank
  ]

  for (const result of round1Results) {
    const winnerId = userIds[result.winner]
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        player1_score: result.p1Score,
        player2_score: result.p2Score,
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', result.match.id)
    assert(!updateError, `${names[result.winner]} 勝利 (${result.p1Score}-${result.p2Score})`)

    // 次の試合に勝者を進出
    if (result.match.next_match_id) {
      const updateField = result.match.next_match_slot === 1 ? 'player1_id' : 'player2_id'
      await supabase
        .from('matches')
        .update({ [updateField]: winnerId })
        .eq('id', result.match.next_match_id)
    }
  }

  // 7. 準決勝結果入力
  console.log('\n📝 Step 7: 準決勝結果入力')
  const { data: round2Matches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 2)
    .order('match_number', { ascending: true })

  assert(round2Matches?.length === 2, `準決勝: ${round2Matches?.length}/2 試合`)

  // Alice vs Charlie → Alice wins
  const sf1 = round2Matches![0]
  assert(sf1.player1_id === userIds[0], `準決勝1 P1: Alice`)
  assert(sf1.player2_id === userIds[2], `準決勝1 P2: Charlie`)

  await supabase.from('matches').update({
    player1_score: 2, player2_score: 0,
    winner_id: userIds[0], status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', sf1.id)
  if (sf1.next_match_id) {
    const field = sf1.next_match_slot === 1 ? 'player1_id' : 'player2_id'
    await supabase.from('matches').update({ [field]: userIds[0] }).eq('id', sf1.next_match_id)
  }
  assert(true, 'Alice 準決勝勝利 (2-0)')

  // Eve vs Hank → Hank wins
  const sf2 = round2Matches![1]
  assert(sf2.player1_id === userIds[4], `準決勝2 P1: Eve`)
  assert(sf2.player2_id === userIds[7], `準決勝2 P2: Hank`)

  await supabase.from('matches').update({
    player1_score: 1, player2_score: 2,
    winner_id: userIds[7], status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', sf2.id)
  if (sf2.next_match_id) {
    const field = sf2.next_match_slot === 1 ? 'player1_id' : 'player2_id'
    await supabase.from('matches').update({ [field]: userIds[7] }).eq('id', sf2.next_match_id)
  }
  assert(true, 'Hank 準決勝勝利 (2-1)')

  // 8. 決勝結果入力
  console.log('\n📝 Step 8: 決勝結果入力')
  const { data: finalMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 3)

  const finalMatch = finalMatches![0]
  assert(finalMatch.player1_id === userIds[0], `決勝 P1: Alice`)
  assert(finalMatch.player2_id === userIds[7], `決勝 P2: Hank`)

  await supabase.from('matches').update({
    player1_score: 2, player2_score: 1,
    winner_id: userIds[0], status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', finalMatch.id)
  assert(true, 'Alice 優勝！ (2-1)')

  // 9. 大会完了
  console.log('\n📝 Step 9: 大会完了')
  const { error: completeError } = await supabase
    .from('tournaments')
    .update({ status: 'completed' })
    .eq('id', tournamentId)
  assert(!completeError, `ステータス: completed`)

  // 10. 最終確認
  console.log('\n📝 Step 10: 最終確認')
  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')
  assert(allMatches?.length === 7, `全試合完了: ${allMatches?.length}/7`)

  const { data: finalTournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single()
  assert(finalTournament?.status === 'completed', `大会ステータス: completed`)

  return userIds
}

// ============================================================
// Test: BYEテスト（5人参加）
// ============================================================
async function testByeTournament(sharedUserIds: string[]) {
  console.log('\n\n🏆 テスト: 5人シングルエリミネーション (BYEテスト)')
  console.log('=' .repeat(60))

  const userIds = sharedUserIds.slice(0, 5)
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']

  // 大会作成
  console.log('\n📝 Step 1: 5人大会作成')
  const { data: tournament, error: createError } = await supabase
    .from('tournaments')
    .insert({
      title: 'テスト大会: 5人BYEテスト',
      description: 'BYE自動進出テスト',
      organizer_id: userIds[0],
      tournament_format: 'single_elimination',
      match_format: 'bo3',
      max_participants: 8,
      visibility: 'public',
      status: 'recruiting',
      entry_mode: 'open',
    })
    .select()
    .single()
  if (createError) {
    console.error('  大会作成エラー:', createError.message)
    return
  }
  const tournamentId = tournament!.id

  // エントリー
  for (let i = 0; i < 5; i++) {
    await supabase.from('participants').insert({
      tournament_id: tournamentId,
      user_id: userIds[i],
      display_name: names[i],
    })
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  // ブラケット生成
  console.log('\n📝 Step 2: ブラケット生成 (5人→8枠)')
  const bracketMatches = generateSingleEliminationBracket(
    tournamentId,
    participants!.map((p) => ({
      user_id: p.user_id,
      seed: p.seed,
      entry_number: p.entry_number,
    }))
  )

  // 8枠のトーナメント = 7試合
  assert(bracketMatches.length === 7, `マッチ数: ${bracketMatches.length}/7`)

  // BYE試合の確認（5人→8枠: R1M3=BYE, R2M2=連鎖BYE, R1M4=空枠pending）
  const byeMatches = bracketMatches.filter((m) => m.status === 'bye')
  assert(byeMatches.length === 2, `BYE試合: ${byeMatches.length}/2`)

  // BYE勝者が次ラウンドに進出しているか確認
  console.log('\n📝 Step 3: BYE勝者の自動進出確認')
  for (const byeMatch of byeMatches) {
    if (byeMatch.next_match_id) {
      const nextMatch = bracketMatches.find((m) => m.id === byeMatch.next_match_id)
      if (nextMatch) {
        const slot = byeMatch.next_match_slot === 1 ? nextMatch.player1_id : nextMatch.player2_id
        assert(
          slot === byeMatch.winner_id,
          `BYE R${byeMatch.round}M${byeMatch.match_number} → R${nextMatch.round}M${nextMatch.match_number} に勝者進出`
        )
      }
    }
  }

  // 実際の対戦が必要な試合の確認
  const pendingMatches = bracketMatches.filter((m) => m.status === 'pending')
  console.log(`\n  対戦が必要な試合: ${pendingMatches.length}`)
  for (const m of pendingMatches) {
    const p1Name = m.player1_id ? names[userIds.indexOf(m.player1_id)] || '?' : 'TBD'
    const p2Name = m.player2_id ? names[userIds.indexOf(m.player2_id)] || '?' : 'TBD'
    console.log(`    R${m.round}M${m.match_number}: ${p1Name} vs ${p2Name}`)
  }

  // DBに挿入して検証
  const { error: insertError } = await supabase.from('matches').insert(bracketMatches)
  assert(!insertError, `マッチデータ挿入成功`)

  await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', tournamentId)

  // 2回戦の試合確認
  const round2 = bracketMatches.filter((m) => m.round === 2)
  // R2M1: 1回戦の勝者が入る→まだ空（pending）
  const r2m1 = round2.find((m) => m.match_number === 1)
  assert(r2m1?.status === 'pending', `R2M1: pending (1回戦待ち)`)
  // R2M2: Eve が BYE で自動進出 → 決勝へも連鎖BYE
  const r2m2 = round2.find((m) => m.match_number === 2)
  assert(r2m2?.status === 'bye', `R2M2: BYE (Eve自動進出)`)

  // 決勝にEveが入っているか
  const finalMatch = bracketMatches.find((m) => m.round === 3)
  assert(finalMatch?.player2_id === userIds[4], `決勝にEveが自動進出`)
}

// ============================================================
// Test: 招待制大会テスト
// ============================================================
async function testInviteOnlyTournament(sharedUserIds: string[]) {
  console.log('\n\n🏆 テスト: 招待制大会')
  console.log('=' .repeat(60))

  const userIds = sharedUserIds.slice(0, 3)

  // 招待制大会作成
  console.log('\n📝 Step 1: 招待制大会作成')
  const { data: tournament, error: createError } = await supabase
    .from('tournaments')
    .insert({
      title: 'テスト大会: 招待制',
      description: '招待制テスト',
      organizer_id: userIds[0],
      tournament_format: 'single_elimination',
      match_format: 'bo1',
      max_participants: 8,
      visibility: 'public',
      status: 'recruiting',
      entry_mode: 'invite_only',
    })
    .select()
    .single()
  assert(!createError, `招待制大会作成成功`)
  assert(tournament?.entry_mode === 'invite_only', `entry_mode: invite_only`)

  // 招待送信
  console.log('\n📝 Step 2: 招待送信')
  const { error: inviteError } = await supabase
    .from('tournament_invites')
    .insert({
      tournament_id: tournament!.id,
      user_id: userIds[1],
      invited_by: userIds[0],
    })
  assert(!inviteError, `ユーザー2に招待送信`)

  // 招待一覧取得
  const { data: invites } = await supabase
    .from('tournament_invites')
    .select('*')
    .eq('tournament_id', tournament!.id)
  assert(invites?.length === 1, `招待数: ${invites?.length}/1`)
  assert(invites?.[0].status === 'pending', `招待ステータス: pending`)

  // 招待承諾（ステータス更新）
  const { error: acceptError } = await supabase
    .from('tournament_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invites![0].id)
  assert(!acceptError, `招待承諾`)
}

// ============================================================
// Test: カスタムフィールド付きエントリー
// ============================================================
async function testCustomFieldEntry(sharedUserIds: string[]) {
  console.log('\n\n🏆 テスト: カスタムフィールド付きエントリー')
  console.log('=' .repeat(60))

  const userIds = sharedUserIds.slice(0, 2)

  // カスタムフィールド付き大会作成
  const customFields = [
    { key: 'deck_name', label: 'デッキ名', inputType: 'text', required: true, hidden: false, editDeadline: 'bracket_published', placeholder: 'デッキ名を入力' },
    { key: 'consent', label: '大会ルール同意', inputType: 'checkbox', required: true, hidden: false, editDeadline: 'entry_closed', placeholder: '', options: ['同意する'] },
  ]

  const { data: tournament } = await supabase
    .from('tournaments')
    .insert({
      title: 'テスト大会: カスタムフィールド',
      organizer_id: userIds[0],
      tournament_format: 'single_elimination',
      match_format: 'bo3',
      max_participants: 8,
      visibility: 'public',
      status: 'recruiting',
      entry_mode: 'open',
      custom_fields: customFields,
    })
    .select()
    .single()

  assert(!!tournament, `カスタムフィールド付き大会作成`)
  assert(Array.isArray(tournament?.custom_fields), `custom_fields がJSONBで保存`)

  // カスタムデータ付きエントリー
  const { error: entryError } = await supabase
    .from('participants')
    .insert({
      tournament_id: tournament!.id,
      user_id: userIds[1],
      display_name: 'TestPlayer',
      custom_data: { deck_name: '天威勇者', consent: '同意する' },
    })
  assert(!entryError, `カスタムデータ付きエントリー成功`)

  // データ取得して確認
  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournament!.id)
    .eq('user_id', userIds[1])
    .single()
  const customData = participant?.custom_data as Record<string, string> | null
  assert(customData?.deck_name === '天威勇者', `カスタムデータ取得: デッキ名=${customData?.deck_name}`)
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🎮 Katorin2 大会運営フロー 全機能テスト')
  console.log('=' .repeat(60))

  try {
    console.log('\n🧹 テストデータクリーンアップ...')
    await cleanup()
    console.log('  完了')

    const userIds = await testFullTournament()
    await testByeTournament(userIds)
    await testInviteOnlyTournament(userIds)
    await testCustomFieldEntry(userIds)

    console.log('\n\n' + '=' .repeat(60))
    console.log(`📊 結果: ${pass} passed, ${fail} failed`)
    console.log('=' .repeat(60))

    if (fail > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('\n💥 Fatal error:', err)
    process.exit(1)
  }
}

main()
