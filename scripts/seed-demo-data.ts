/**
 * WMGP Season 8 デモデータ投入（新モデル: Series/Tournament分離）
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-demo-data.ts
 *   # ローカル: SUPABASE_SERVICE_ROLE_KEY=<local key> npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 16チーム（Group A: 0-7, Group B: 8-15）
const TEAMS_DATA = [
  // Group A
  { name: 'Tyrant Typhoon', members: ['じゃぱん', '胃の中のウツボ', 'Rei_', 'nia', 'winter', 'たいたい'] },
  { name: 'Canada + Enzo', members: ['Joey', 'Ryan', 'Mistilteinn', 'soulsmanic', 'Rehan S', 'Enzo'] },
  { name: 'The Gentlemen\'s Club', members: ['Fláviofc', 'Sir Guaxinim', 'rafa', 'Nicezin', 'Justinian', 'mateusbra'] },
  { name: 'Brotherhood of Shadow', members: ['ERMAC', 'DR,DOOM', 'omar', 'Hegazi', 'Thereal', 'Murad Adel'] },
  { name: 'Not Equal', members: ['黎明', 'Gupta', 'sai.1996', 'クロトワ', '有栖α', 'やまてぃー'] },
  { name: 'Espada', members: ['Ryuran', 'ペルセ', 'しらっくす', 'ギャグナ', 'トイタク', 'からふる'] },
  { name: 'DS Celebeast', members: ['Sieg', 'Cain', 'Yuryevna', 'Lonts', 'DS Awarix', 'Mev'] },
  { name: 'exclusion', members: ['じょがい', 'にええば', 'アンチ除外教', '月露氷華ルメ', 'maizono', 'ナー島'] },
  // Group B
  { name: 'Night Edge', members: ['AIZEN', 'LOKI', 'RESCUE ACE', 'Mosaab', 'Ziad', 'POP'] },
  { name: 'Bastardos', members: ['Orco', 'Criis', 'Ranas', 'Felhyphe', 'Hugo', 'Gialux2'] },
  { name: 'HX(幻星)', members: ['千祢ん', '广白', 'ちょうせいりょう', '莫忘超雷龙', '栗鼠', 'はるか'] },
  { name: 'TEAM VILLAIN', members: ['BOSS', 'Decade', 'Ryuu', 'prostraight', 'Lionheart', 'Thomas'] },
  { name: 'Cat Paradise', members: ['Punn', 'eri', 'Sn1p', 'mordred', 'sora', 'Lily'] },
  { name: 'Raid Reign', members: ['ゆき。', 'サラダバー', 'フリーダム', 'カズカズ', '軍神サバイバー', 'エアーマン鈴木'] },
  { name: 'Phoenix Gaming', members: ['MiniFez', 'Hawkeye', 'Yokeman', 'Rogerin', 'Benk1w', 'Matrixx'] },
  { name: 'illusion of cactus', members: ['るし', 'おきなっとう', '銀マヨ', 'あおい', 'ただの信者', 'さいぱち'] },
]

// 試合結果（Week 1: 4+4=8試合, Week 2: 4+4=8試合 → 合計14試合分）
const MATCH_RESULTS: { week: number; t1: number; t2: number; rounds: { t1w: number; t2w: number }[]; winner: number }[] = [
  // Group A - Week 1
  { week: 1, t1: 0, t2: 3, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 0 },
  { week: 1, t1: 1, t2: 2, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 1 },
  { week: 1, t1: 4, t2: 5, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 4 },
  { week: 1, t1: 6, t2: 7, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 6 },
  // Group B - Week 1
  { week: 1, t1: 8, t2: 9, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 8 },
  { week: 1, t1: 10, t2: 11, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 10 },
  { week: 1, t1: 12, t2: 13, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:1,t2w:2}], winner: 13 },
  { week: 1, t1: 14, t2: 15, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 14 },
  // Group A - Week 2
  { week: 2, t1: 0, t2: 2, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:1,t2w:2}], winner: 2 },
  { week: 2, t1: 1, t2: 3, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 1 },
  { week: 2, t1: 4, t2: 6, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:1,t2w:2}], winner: 6 },
  { week: 2, t1: 5, t2: 7, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 5 },
  // Group B - Week 2
  { week: 2, t1: 8, t2: 10, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 8 },
  { week: 2, t1: 9, t2: 11, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 9 },
]

const DECKS = [
  'Ryzeal', 'Maliss', 'Ryzeal FS', 'Primite Blue Eyes', 'Memento',
  'MYLICE', 'Mermail Atlantean', 'Tenpai SS', 'Snake-Eye', 'Yubel',
  'R-ACE', 'Voiceless Voice', 'Centurion', 'White Forest', 'Labrynth',
]

const WMGP_SERIES_CONFIG = {
  orderSize: 3,
  subCount: 1,
  playersPerRound: 3,
  banPickEnabled: false,
  duplicateThemeAllowed: true,
  qualifierFormat: 'round_robin',
  blockCount: 2,
  roundsToWin: 2,
  matchFormat: 'bo3',
  scoring: {
    winPoints: 3,
    lossPoints: 0,
    tiebreakers: ['totalRoundDiff', 'roundMatchDiff', 'duelDiff', 'totalRoundScore', 'headToHead'],
  },
  finals: { format: 'single_elimination', qualifiedPerBlock: [1, '2or3'] },
  memberChangeAllowed: true,
  maxMemberChanges: 2,
}

async function main() {
  console.log('🎮 WMGP Season 8 デモ投入（新モデル）')
  console.log(`  URL: ${SUPABASE_URL}`)

  // === クリーンアップ ===
  console.log('\n🧹 既存デモデータ削除...')

  // デモシリーズ配下の大会→match→関連データ削除
  const { data: demoSeries } = await supabase.from('leagues').select('id').eq('is_demo', true)
  if (demoSeries?.length) {
    const seriesIds = demoSeries.map(s => s.id)
    const { data: demoTs } = await supabase.from('rounds').select('id').in('league_id', seriesIds)
    if (demoTs?.length) {
      const tids = demoTs.map(t => t.id)
      const { data: matchIds } = await supabase.from('matches').select('id').in('round_id', tids)
      const mIds = matchIds?.map(m => m.id) || []
      if (mIds.length) {
        await supabase.from('individual_matches').delete().in('match_id', mIds)
        await supabase.from('war_rounds').delete().in('match_id', mIds)
        await supabase.from('war_orders').delete().in('match_id', mIds)
      }
      await supabase.from('matches').delete().in('round_id', tids)
      await supabase.from('team_entries').delete().in('round_id', tids)
      await supabase.from('rounds').delete().in('league_id', seriesIds)
    }
    await supabase.from('round_blocks').delete().in('league_id', seriesIds)
    // チーム削除（series所属）
    await supabase.from('team_members').delete().in('team_id',
      ((await supabase.from('teams').select('id').in('league_id', seriesIds)).data || []).map(t => t.id)
    )
    await supabase.from('teams').delete().in('league_id', seriesIds)
    await supabase.from('leagues').delete().eq('is_demo', true)
  }

  // デモ大会（league_id=null）もクリーンアップ
  const { data: demoT } = await supabase.from('rounds').select('id').eq('is_demo', true)
  if (demoT?.length) {
    const ids = demoT.map(t => t.id)
    const { data: matchIds } = await supabase.from('matches').select('id').in('round_id', ids)
    const mIds = matchIds?.map(m => m.id) || []
    if (mIds.length) {
      await supabase.from('individual_matches').delete().in('match_id', mIds)
      await supabase.from('war_rounds').delete().in('match_id', mIds)
      await supabase.from('war_orders').delete().in('match_id', mIds)
    }
    await supabase.from('matches').delete().in('round_id', ids)
    await supabase.from('team_entries').delete().in('round_id', ids)
    await supabase.from('round_blocks').delete().in('round_id', ids)
    await supabase.from('rounds').delete().eq('is_demo', true)
  }

  // デモユーザー削除（固定アカウントは保持）
  const KEEP_EMAILS = ['demo@katorin2.codenica.dev', 'demo_leader@katorin2.codenica.dev']
  // 全ユーザーをページネーションで取得
  let allUsersForCleanup: { id: string; email?: string }[] = []
  let cleanupPage = 1
  while (true) {
    const { data: pg } = await supabase.auth.admin.listUsers({ page: cleanupPage, perPage: 500 })
    if (!pg?.users?.length) break
    allUsersForCleanup = allUsersForCleanup.concat(pg.users)
    if (pg.users.length < 500) break
    cleanupPage++
  }
  for (const u of allUsersForCleanup) {
    if (u.email?.startsWith('demo_') && !KEEP_EMAILS.includes(u.email || '')) {
      await supabase.from('team_members').delete().eq('user_id', u.id)
      await supabase.from('profiles').delete().eq('id', u.id)
      await supabase.auth.admin.deleteUser(u.id)
    }
  }
  // 固定アカウントのチームメンバーシップだけ削除（再作成するため）
  for (const email of KEEP_EMAILS) {
    const keeper = allUsersForCleanup.find(u => u.email === email)
    if (keeper) {
      await supabase.from('team_members').delete().eq('user_id', keeper.id)
    }
  }
  console.log('  ✅ クリーンアップ完了')

  // === デモアカウント（主催者 + リーダー）===
  console.log('\n📝 デモアカウント確認')
  const DEMO_PASSWORD = 'KatorinDemo2026!'
  const DEMO_ORGANIZER_EMAIL = 'demo@katorin2.codenica.dev'
  const DEMO_LEADER_EMAIL = 'demo_leader@katorin2.codenica.dev'

  // 主催者アカウント（既存 or 新規）
  let organizerId: string
  // listUsersはページネーションがあるので全ページ取得
  let allExistingUsers: { id: string; email?: string }[] = []
  let page = 1
  while (true) {
    const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 500 })
    if (!pageData?.users?.length) break
    allExistingUsers = allExistingUsers.concat(pageData.users)
    if (pageData.users.length < 500) break
    page++
  }

  async function getOrCreateUser(email: string, password: string, displayName: string): Promise<string> {
    // まず作成を試みる
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (created?.user) {
      console.log(`  ✅ ${displayName}: ${email} (新規作成)`)
      return created.user.id
    }
    // 重複エラー → 全ユーザーから検索して既存IDを返す
    if (createErr?.message?.includes('already been registered')) {
      // ページネーションで全ユーザー取得
      let all: { id: string; email?: string }[] = []
      let p = 1
      while (true) {
        const { data: pg } = await supabase.auth.admin.listUsers({ page: p, perPage: 1000 })
        if (!pg?.users?.length) break
        all = all.concat(pg.users)
        if (pg.users.length < 1000) break
        p++
      }
      const found = all.find(u => u.email === email)
      if (found) {
        await supabase.from('profiles').upsert({ id: found.id, display_name: displayName })
        console.log(`  ✅ ${displayName}: ${email} (既存)`)
        return found.id
      }
      // listUsersで見つからない場合（db reset後のorphan）→ 別クライアントでsignInして取得
      const tempClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: signInData } = await tempClient.auth.signInWithPassword({ email, password })
      if (signInData?.user) {
        await supabase.from('profiles').upsert({ id: signInData.user.id, display_name: displayName })
        console.log(`  ✅ ${displayName}: ${email} (signIn経由)`)
        return signInData.user.id
      }
    }
    throw new Error(`Failed to get or create user ${email}: ${createErr?.message}`)
  }

  organizerId = await getOrCreateUser(DEMO_ORGANIZER_EMAIL, DEMO_PASSWORD, 'WMGP運営')

  // リーダーアカウント（Team 0のリーダーとして使用）
  const demoLeaderId = await getOrCreateUser(DEMO_LEADER_EMAIL, DEMO_PASSWORD, 'デモリーダー')

  // === チームメンバー作成 ===
  console.log('\n📝 16チーム × 6人 作成')
  const userIds: string[][] = []
  for (let t = 0; t < TEAMS_DATA.length; t++) {
    const td = TEAMS_DATA[t]
    const mids: string[] = []

    if (t === 0) {
      mids.push(demoLeaderId)
      for (let m = 1; m < td.members.length; m++) {
        const uid = await getOrCreateUser(`demo_t${t}_p${m}@katorin.dev`, 'demo1234', td.members[m])
        mids.push(uid)
      }
    } else {
      for (let m = 0; m < td.members.length; m++) {
        const uid = await getOrCreateUser(`demo_t${t}_p${m}@katorin.dev`, 'demo1234', td.members[m])
        mids.push(uid)
      }
    }
    userIds.push(mids)
  }

  // === シリーズ作成 ===
  console.log('\n📝 シリーズ作成: WMGP Season 8')
  const { data: series } = await supabase.from('leagues').insert({
    title: 'WMGP Season 8 - Demo',
    description: 'World Master Grand Prix Season 8\n16チーム・2グループ総当たり → 決勝トーナメント\n\n※ 実データに基づくデモ',
    organizer_id: organizerId,
    visibility: 'public',
    status: 'in_progress',
    entry_type: 'team',
    team_battle_format: 'point',
    team_size_min: 6,
    team_size_max: 15,
    league_config: WMGP_SERIES_CONFIG,
    theme_config: {
      primaryColor: '#1e40af', secondaryColor: '#0f172a', accentColor: '#f59e0b',
      bgColor: '#0f172a', textColor: '#f8fafc', fontFamily: 'sans-serif',
    },
    is_demo: true,
  }).select().single()
  const seriesId = series!.id

  // === チーム作成（シリーズ所属）===
  console.log('\n📝 チーム作成（シリーズ所属）')
  const teams: { id: string; name: string; memberIds: string[] }[] = []
  for (let t = 0; t < TEAMS_DATA.length; t++) {
    const td = TEAMS_DATA[t]
    const mids = userIds[t]
    const { data: team } = await supabase.from('teams')
      .insert({ name: td.name, leader_id: mids[0], league_id: seriesId })
      .select().single()
    await supabase.from('team_members').insert(
      mids.map((uid, i) => ({ team_id: team!.id, user_id: uid, role: i === 0 ? 'leader' as const : 'member' as const }))
    )
    teams.push({ id: team!.id, name: td.name, memberIds: mids })
    console.log(`  ✅ ${td.name}`)
  }

  // === ブロック作成（シリーズ所属）===
  // tournament_blocks.round_id は NOT NULL なので、ダミー大会が必要
  // → ブロックは最初の大会(Week 1)に紐づけつつ、league_id も設定

  // === 大会作成（Week 1, Week 2）===
  console.log('\n📝 大会（節）作成')
  const tournamentIds: string[] = []
  for (let week = 1; week <= 2; week++) {
    const { data: t } = await supabase.from('rounds').insert({
      title: `WMGP S8 - Week ${week}`,
      description: `第${week}節`,
      organizer_id: organizerId,
      format: 'round_robin',
      match_format: 'bo3',
      entry_type: 'team',
      max_participants: 64,
      visibility: 'public',
      status: week <= 2 ? 'completed' : 'draft',
      entry_mode: 'open',
      league_id: seriesId,
      round_order: week,
      order_size: 3,
      sub_count: 1,
      players_per_round: 3,
      win_point_value: 3,
      is_demo: true,
    }).select().single()
    tournamentIds.push(t!.id)
    console.log(`  ✅ Week ${week}: ${t!.id}`)
  }

  // ブロック作成（Week 1の大会に紐づけ + league_id）
  const { data: gA } = await supabase.from('round_blocks').insert({
    round_id: tournamentIds[0], block_name: 'Group A', block_order: 1, league_id: seriesId,
  }).select().single()
  const { data: gB } = await supabase.from('round_blocks').insert({
    round_id: tournamentIds[0], block_name: 'Group B', block_order: 2, league_id: seriesId,
  }).select().single()

  // 各大会にチームエントリー
  for (const tid of tournamentIds) {
    for (let i = 0; i < 16; i++) {
      await supabase.from('team_entries').insert({
        round_id: tid, team_id: teams[i].id, block_id: i < 8 ? gA!.id : gB!.id,
      })
    }
  }

  // === 対戦カード生成（各Weekの大会に紐づけ）===
  console.log('\n📝 対戦カード生成')
  const matchMap = new Map<string, string>()

  // Weekごとに試合結果からマッチを作成
  for (let week = 1; week <= 2; week++) {
    const tid = tournamentIds[week - 1]
    const weekResults = MATCH_RESULTS.filter(r => r.week === week)
    let mc = 0
    for (const r of weekResults) {
      mc++
      const t1 = teams[r.t1], t2 = teams[r.t2]
      const blockId = r.t1 < 8 ? gA!.id : gB!.id
      const { data: m } = await supabase.from('matches').insert({
        round_id: tid, round: 1, match_number: mc,
        team1_id: t1.id, team2_id: t2.id, block_id: blockId, status: 'pending',
      }).select().single()
      matchMap.set(`${r.t1}:${r.t2}`, m!.id)
    }
    console.log(`  ✅ Week ${week}: ${mc} 試合`)
  }

  // === 試合結果入力 ===
  console.log('\n📝 試合結果入力')
  for (const r of MATCH_RESULTS) {
    const t1 = teams[r.t1], t2 = teams[r.t2]
    const matchId = matchMap.get(`${r.t1}:${r.t2}`)
    if (!matchId) { console.error(`  ⚠️ Not found: ${t1.name} vs ${t2.name}`); continue }

    // オーダー
    for (const team of [t1, t2]) {
      const tIdx = teams.indexOf(team)
      const off = tIdx * 2
      await supabase.from('war_orders').insert(
        team.memberIds.slice(0, 4).map((uid, i) => ({
          match_id: matchId, team_id: team.id, slot: i + 1, user_id: uid,
          deck_name: DECKS[(off + i) % DECKS.length],
          deck_theme: DECKS[(off + i) % DECKS.length],
          is_sub: i === 3, is_picked: i < 3,
        }))
      )
    }

    let totalT1 = 0, totalT2 = 0
    for (let ri = 0; ri < r.rounds.length; ri++) {
      const rr = r.rounds[ri]
      const { data: wr } = await supabase.from('war_rounds').insert({
        match_id: matchId, round_number: ri + 1, status: 'completed',
        team1_match_wins: rr.t1w, team2_match_wins: rr.t2w,
        winner_team_id: rr.t1w >= 2 ? t1.id : t2.id,
        completed_at: new Date().toISOString(),
      }).select().single()

      for (let s = 0; s < 3; s++) {
        const p1Win = s < rr.t1w
        if (p1Win) totalT1++; else totalT2++
        await supabase.from('individual_matches').insert({
          match_id: matchId, war_round_id: wr!.id, play_order: ri * 3 + s + 1,
          player1_id: t1.memberIds[s], player2_id: t2.memberIds[s],
          player1_score: p1Win ? 2 : 1, player2_score: p1Win ? 1 : 2,
          player1_duel_wins: p1Win ? 2 : 1, player2_duel_wins: p1Win ? 1 : 2,
          winner_id: p1Win ? t1.memberIds[s] : t2.memberIds[s], status: 'completed',
        })
      }
    }

    const t1rw = r.rounds.filter(x => x.t1w >= 2).length
    const t2rw = r.rounds.filter(x => x.t2w >= 2).length
    await supabase.from('matches').update({
      team1_round_wins: t1rw, team2_round_wins: t2rw,
      team1_wins: totalT1, team2_wins: totalT2,
      winner_team_id: teams[r.winner].id, status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', matchId)

    console.log(`  ✅ ${t1.name} ${t1rw}-${t2rw} ${t2.name}`)
  }

  // === BYE試合サンプル（予選 Week 2, Group B）===
  console.log('\n📝 BYE試合サンプル追加')
  {
    const byeTeam = teams[12] // Cat Paradise (Group B)
    const { data: byeMatch } = await supabase.from('matches').insert({
      round_id: tournamentIds[1], round: 1, match_number: 99,
      team1_id: byeTeam.id, team2_id: null, block_id: gB!.id,
      status: 'completed', is_bye: true,
      winner_team_id: byeTeam.id,
      team1_round_wins: 0, team2_round_wins: 0,
      team1_wins: 0, team2_wins: 0,
      completed_at: new Date().toISOString(),
    }).select().single()
    console.log(`  ✅ BYE: ${byeTeam.name} (match ${byeMatch!.id})`)
  }

  // === 没収試合サンプル（予選 Week 2, Group A）===
  console.log('\n📝 没収試合サンプル追加')
  {
    const forfeitLoser = teams[4]  // Not Equal (Group A)
    const forfeitWinner = teams[7] // exclusion (Group A)
    const { data: forfeitMatch } = await supabase.from('matches').insert({
      round_id: tournamentIds[1], round: 1, match_number: 98,
      team1_id: forfeitLoser.id, team2_id: forfeitWinner.id, block_id: gA!.id,
      status: 'completed', is_forfeit: true,
      winner_team_id: forfeitWinner.id,
      team1_round_wins: 1, team2_round_wins: 2,
      team1_wins: 0, team2_wins: 0,
      completed_at: new Date().toISOString(),
    }).select().single()
    console.log(`  ✅ 没収: ${forfeitLoser.name} 1-2 ${forfeitWinner.name} (match ${forfeitMatch!.id})`)
  }

  // === 決勝ラウンド ===
  console.log('\n📝 決勝ラウンド作成')

  // 予選ブロック上位2チーム（MATCH_RESULTSから勝敗集計）
  // Group A: teams 0-7, Group B: teams 8-15
  const winCounts = new Map<number, number>()
  for (let i = 0; i < 16; i++) winCounts.set(i, 0)
  for (const r of MATCH_RESULTS) {
    winCounts.set(r.winner, (winCounts.get(r.winner) || 0) + 1)
  }
  // Group A 上位2
  const groupATeamIdxs = [0, 1, 2, 3, 4, 5, 6, 7]
  groupATeamIdxs.sort((a, b) => (winCounts.get(b) || 0) - (winCounts.get(a) || 0))
  const [a1Idx, a2Idx] = groupATeamIdxs.slice(0, 2)
  // Group B 上位2
  const groupBTeamIdxs = [8, 9, 10, 11, 12, 13, 14, 15]
  groupBTeamIdxs.sort((a, b) => (winCounts.get(b) || 0) - (winCounts.get(a) || 0))
  const [b1Idx, b2Idx] = groupBTeamIdxs.slice(0, 2)

  console.log(`  Group A 上位: ${teams[a1Idx].name}, ${teams[a2Idx].name}`)
  console.log(`  Group B 上位: ${teams[b1Idx].name}, ${teams[b2Idx].name}`)

  const { data: finalsRound } = await supabase.from('rounds').insert({
    title: 'WMGP S8 - Finals',
    description: '決勝トーナメント（各ブロック上位2チーム）',
    organizer_id: organizerId,
    format: 'single_elimination',
    match_format: 'bo3',
    entry_type: 'team',
    max_participants: 4,
    visibility: 'public',
    status: 'completed',
    entry_mode: 'open',
    league_id: seriesId,
    round_order: 3,
    order_size: 3,
    sub_count: 1,
    players_per_round: 3,
    win_point_value: 3,
    is_demo: true,
    is_finals: true,
    source_round_id: tournamentIds[0],
    qualified_per_block: 2,
  }).select().single()
  const finalsRoundId = finalsRound!.id
  console.log(`  ✅ 決勝ラウンド: ${finalsRoundId}`)

  // 決勝ラウンドにチームエントリー
  const finalsTeamIdxs = [a1Idx, a2Idx, b1Idx, b2Idx]
  for (const idx of finalsTeamIdxs) {
    await supabase.from('team_entries').insert({
      round_id: finalsRoundId, team_id: teams[idx].id,
    })
  }

  // 準決勝: A1 vs B2, B1 vs A2
  const FINALS_MATCHES: { t1: number; t2: number; rounds: { t1w: number; t2w: number }[]; winner: number; matchNumber: number; round: number; nextMatchNumber: number }[] = [
    // SF1: A1 vs B2
    { t1: a1Idx, t2: b2Idx, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: a1Idx, matchNumber: 1, round: 1, nextMatchNumber: 3 },
    // SF2: B1 vs A2
    { t1: b1Idx, t2: a2Idx, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: b1Idx, matchNumber: 2, round: 1, nextMatchNumber: 3 },
    // Final: SF1勝者 vs SF2勝者
    { t1: a1Idx, t2: b1Idx, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: a1Idx, matchNumber: 3, round: 2, nextMatchNumber: 0 },
  ]

  // まず全matchを作成（next_match_id参照のため）
  const finalsMatchIds: string[] = []
  for (const fm of FINALS_MATCHES) {
    const { data: m } = await supabase.from('matches').insert({
      round_id: finalsRoundId, round: fm.round, match_number: fm.matchNumber,
      team1_id: teams[fm.t1].id, team2_id: teams[fm.t2].id,
      status: 'pending',
    }).select().single()
    finalsMatchIds.push(m!.id)
  }

  // next_match_id を設定（準決勝→決勝）
  await supabase.from('matches').update({ next_match_id: finalsMatchIds[2], next_match_slot: 1 }).eq('id', finalsMatchIds[0])
  await supabase.from('matches').update({ next_match_id: finalsMatchIds[2], next_match_slot: 2 }).eq('id', finalsMatchIds[1])

  // 試合結果入力
  console.log('\n📝 決勝ラウンド試合結果入力')
  for (let fi = 0; fi < FINALS_MATCHES.length; fi++) {
    const fm = FINALS_MATCHES[fi]
    const matchId = finalsMatchIds[fi]
    const t1 = teams[fm.t1], t2 = teams[fm.t2]

    // オーダー
    for (const team of [t1, t2]) {
      const tIdx = teams.indexOf(team)
      const off = tIdx * 2
      await supabase.from('war_orders').insert(
        team.memberIds.slice(0, 4).map((uid, i) => ({
          match_id: matchId, team_id: team.id, slot: i + 1, user_id: uid,
          deck_name: DECKS[(off + i) % DECKS.length],
          deck_theme: DECKS[(off + i) % DECKS.length],
          is_sub: i === 3, is_picked: i < 3,
        }))
      )
    }

    let totalT1 = 0, totalT2 = 0
    for (let ri = 0; ri < fm.rounds.length; ri++) {
      const rr = fm.rounds[ri]
      const { data: wr } = await supabase.from('war_rounds').insert({
        match_id: matchId, round_number: ri + 1, status: 'completed',
        team1_match_wins: rr.t1w, team2_match_wins: rr.t2w,
        winner_team_id: rr.t1w >= 2 ? t1.id : t2.id,
        completed_at: new Date().toISOString(),
      }).select().single()

      for (let s = 0; s < 3; s++) {
        const p1Win = s < rr.t1w
        if (p1Win) totalT1++; else totalT2++
        await supabase.from('individual_matches').insert({
          match_id: matchId, war_round_id: wr!.id, play_order: ri * 3 + s + 1,
          player1_id: t1.memberIds[s], player2_id: t2.memberIds[s],
          player1_score: p1Win ? 2 : 1, player2_score: p1Win ? 1 : 2,
          player1_duel_wins: p1Win ? 2 : 1, player2_duel_wins: p1Win ? 1 : 2,
          winner_id: p1Win ? t1.memberIds[s] : t2.memberIds[s], status: 'completed',
        })
      }
    }

    const t1rw = fm.rounds.filter(x => x.t1w >= 2).length
    const t2rw = fm.rounds.filter(x => x.t2w >= 2).length
    await supabase.from('matches').update({
      team1_round_wins: t1rw, team2_round_wins: t2rw,
      team1_wins: totalT1, team2_wins: totalT2,
      winner_team_id: teams[fm.winner].id, status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', matchId)

    const label = fi < 2 ? `準決勝${fi + 1}` : '決勝'
    console.log(`  ✅ ${label}: ${t1.name} ${t1rw}-${t2rw} ${t2.name}`)
  }

  // === 順位確認 ===
  // block_standings は round_id 単位なので、各Weekの結果を表示
  for (const [wi, tid] of tournamentIds.entries()) {
    const { data: standings } = await supabase.from('round_block_standings').select('*').eq('round_id', tid)
    if (standings?.length) {
      for (const gid of [gA!.id, gB!.id]) {
        const g = standings.filter(s => s.block_id === gid).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
        const gname = gid === gA!.id ? 'A' : 'B'
        console.log(`\n📊 Week ${wi + 1} - Group ${gname}:`)
        g.forEach(s => console.log(`  ${s.rank}. ${String(s.team_name).padEnd(25)} ${s.wins}W ${s.losses}L  勝点:${s.total_win_points}  R差:${s.round_diff}`))
      }
    }
  }

  console.log(`\n✅ デモデータ投入完了`)
  console.log(`  リーグ: /leagues/${seriesId}`)
  for (const [wi, tid] of tournamentIds.entries()) {
    console.log(`  Week ${wi + 1}: /rounds/${tid}`)
  }
  console.log(`  決勝: /rounds/${finalsRoundId}`)
  console.log(`  優勝: ${teams[a1Idx].name}`)
}

main().catch(err => { console.error('💥', err); process.exit(1) })
