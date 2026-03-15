/**
 * WMGP Season 8 実データベースのデモデータ投入
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 実データから抽出した16チーム（Group A/B各8チーム）
const TEAMS_DATA = [
  // Group A
  { name: 'Tyrant Typhoon', members: ['じゃぱん', '胃の中のウツボ', 'Rei_', 'nia', 'winter', 'たいたい'] },
  { name: 'Canada + Enzo', members: ['Joey', 'Ryan', 'Mistilteinn', 'soulsmanic', 'Rehan S', 'Enzo'] },
  { name: 'The Gentlemens\'s Club', members: ['Fláviofc', 'Sir Guaxinim', 'rafa', 'Nicezin', 'Justinian', 'mateusbra'] },
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

// 実際の試合結果（画像から読み取り）
const MATCH_RESULTS = [
  // Group A - Week 1
  { t1: 0, t2: 3, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 0 }, // Tyrant Typhoon 2-1 Brotherhood
  { t1: 1, t2: 2, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 1 }, // Canada+Enzo 2-1 Gentlemens
  { t1: 4, t2: 5, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 4 }, // Not Equal 2-0 Espada
  { t1: 6, t2: 7, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 6 }, // Celebeast 2-1 exclusion
  // Group A - Week 2
  { t1: 0, t2: 2, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:1,t2w:2}], winner: 2 }, // Tyrant 1-2 Gentlemens
  { t1: 1, t2: 3, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 1 }, // Canada 2-0 Brotherhood
  { t1: 4, t2: 6, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:1,t2w:2}], winner: 6 }, // NotEqual 1-2 Celebeast
  { t1: 5, t2: 7, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 5 }, // Espada 2-0 exclusion
  // Group B - Week 1
  { t1: 8, t2: 9, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 8 }, // NightEdge 2-0 Bastardos
  { t1: 10, t2: 11, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 10 }, // HX 2-1 VILLAIN
  { t1: 12, t2: 13, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:1,t2w:2}], winner: 13 }, // Cat 1-2 RaidReign
  { t1: 14, t2: 15, rounds: [{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 14 }, // Phoenix 2-0 cactus
  // Group B - Week 2
  { t1: 8, t2: 10, rounds: [{t1w:2,t2w:1},{t1w:1,t2w:2},{t1w:2,t2w:1}], winner: 8 }, // NightEdge 2-1 HX
  { t1: 9, t2: 11, rounds: [{t1w:1,t2w:2},{t1w:2,t2w:1},{t1w:2,t2w:1}], winner: 9 }, // Bastardos 2-1 VILLAIN
]

const DECKS = [
  'Ryzeal', 'Maliss', 'Ryzeal FS', 'Primite Blue Eyes', 'Memento',
  'MYLICE', 'Mermail Atlantean', 'Tenpai SS', 'Snake-Eye', 'Yubel',
  'R-ACE', 'Voiceless Voice', 'Centurion', 'White Forest', 'Labrynth',
]

async function main() {
  console.log('🎮 WMGP実データ デモ投入')
  console.log(`  URL: ${SUPABASE_URL}`)

  // クリーンアップ
  console.log('\n🧹 既存デモデータ削除...')
  const { data: demoT } = await supabase.from('tournaments').select('id').eq('is_demo', true)
  if (demoT?.length) {
    const ids = demoT.map(t => t.id)
    const { data: matchIds } = await supabase.from('matches').select('id').in('tournament_id', ids)
    const mIds = matchIds?.map(m => m.id) || []
    if (mIds.length) {
      await supabase.from('individual_matches').delete().in('match_id', mIds)
      await supabase.from('war_rounds').delete().in('match_id', mIds)
      await supabase.from('war_orders').delete().in('match_id', mIds)
    }
    await supabase.from('matches').delete().in('tournament_id', ids)
    await supabase.from('swiss_standings').delete().in('tournament_id', ids)
    await supabase.from('team_entries').delete().in('tournament_id', ids)
    await supabase.from('tournament_blocks').delete().in('tournament_id', ids)
    await supabase.from('tournaments').delete().eq('is_demo', true)
  }
  const { data: demoUsers } = await supabase.auth.admin.listUsers({ perPage: 200 })
  for (const u of demoUsers?.users || []) {
    if (u.email?.startsWith('demo_')) {
      await supabase.from('team_members').delete().eq('user_id', u.id)
      await supabase.from('profiles').delete().eq('id', u.id)
      await supabase.auth.admin.deleteUser(u.id)
    }
  }

  // ユーザー&チーム作成
  console.log('\n📝 16チーム × 6人 作成')
  const teams: { id: string; name: string; memberIds: string[] }[] = []
  for (let t = 0; t < TEAMS_DATA.length; t++) {
    const td = TEAMS_DATA[t]
    const memberIds: string[] = []
    for (let m = 0; m < td.members.length; m++) {
      const { data } = await supabase.auth.admin.createUser({
        email: `demo_t${t}_p${m}@katorin.dev`, password: 'demo1234', email_confirm: true,
        user_metadata: { display_name: td.members[m] },
      })
      if (data?.user) memberIds.push(data.user.id)
    }
    const { data: team } = await supabase.from('teams')
      .insert({ name: td.name, leader_id: memberIds[0] }).select().single()
    await supabase.from('team_members').insert(
      memberIds.map((uid, i) => ({ team_id: team!.id, user_id: uid, role: i === 0 ? 'leader' as const : 'member' as const }))
    )
    teams.push({ id: team!.id, name: td.name, memberIds })
    console.log(`  ✅ ${td.name}`)
  }

  // 大会作成
  console.log('\n📝 大会作成')
  const { data: tournament } = await supabase.from('tournaments').insert({
    title: 'WMGP Season 8 - Demo',
    description: 'World Master Grand Prix Season 8\n16チーム・2グループ総当たり → 決勝トーナメント\n\n※ 実データに基づくデモ',
    organizer_id: teams[0].memberIds[0],
    tournament_format: 'round_robin', match_format: 'bo3', entry_type: 'team',
    max_participants: 64, visibility: 'public', status: 'in_progress', entry_mode: 'open',
    block_count: 2, rounds_to_win: 2, order_size: 3, sub_count: 1,
    players_per_round: 3, win_point_value: 3, is_demo: true,
    theme_config: { primaryColor: '#1e40af', secondaryColor: '#0f172a', accentColor: '#f59e0b', bgColor: '#0f172a', textColor: '#f8fafc', fontFamily: 'sans-serif', backgroundImage: null, logoUrl: null },
  }).select().single()
  const tid = tournament!.id

  const { data: gA } = await supabase.from('tournament_blocks').insert({ tournament_id: tid, block_name: 'Group A', block_order: 1 }).select().single()
  const { data: gB } = await supabase.from('tournament_blocks').insert({ tournament_id: tid, block_name: 'Group B', block_order: 2 }).select().single()

  for (let i = 0; i < 16; i++) {
    await supabase.from('team_entries').insert({ tournament_id: tid, team_id: teams[i].id, block_id: i < 8 ? gA!.id : gB!.id })
  }

  // 総当たりカード全生成
  console.log('\n📝 対戦カード生成')
  let mc = 0
  const matchMap = new Map<string, string>()

  async function genPairings(blockTeams: typeof teams, blockId: string) {
    const ts = blockTeams.map(t => t.id)
    if (ts.length % 2 === 1) ts.push('BYE')
    const n = ts.length
    for (let w = 0; w < n - 1; w++) {
      for (let i = 0; i < n / 2; i++) {
        const a = ts[i], b = ts[n - 1 - i]
        if (a === 'BYE' || b === 'BYE') continue
        mc++
        const { data: m } = await supabase.from('matches').insert({
          tournament_id: tid, round: w + 1, match_number: mc,
          team1_id: a, team2_id: b, block_id: blockId, status: 'pending',
        }).select().single()
        matchMap.set(`${a}:${b}`, m!.id)
        matchMap.set(`${b}:${a}`, m!.id)
      }
      const last = ts.pop()!; ts.splice(1, 0, last)
    }
  }
  await genPairings(teams.slice(0, 8), gA!.id)
  await genPairings(teams.slice(8), gB!.id)
  console.log(`  ✅ ${mc} 試合`)

  // 結果入力
  console.log('\n📝 試合結果入力')
  for (const r of MATCH_RESULTS) {
    const t1 = teams[r.t1], t2 = teams[r.t2]
    const matchId = matchMap.get(`${t1.id}:${t2.id}`)
    if (!matchId) { console.error(`  ⚠️ Not found: ${t1.name} vs ${t2.name}`); continue }

    // オーダー
    for (const team of [t1, t2]) {
      const off = teams.indexOf(team) * 2
      await supabase.from('war_orders').insert(
        team.memberIds.slice(0, 4).map((uid, i) => ({
          match_id: matchId, team_id: team.id, slot: i + 1, user_id: uid,
          deck_name: DECKS[(off + i) % DECKS.length], deck_theme: DECKS[(off + i) % DECKS.length],
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

  // 順位確認
  const { data: standings } = await supabase.from('block_standings').select('*').eq('tournament_id', tid)
  if (standings) {
    for (const gid of [gA!.id, gB!.id]) {
      const g = standings.filter(s => s.block_id === gid).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      const gname = gid === gA!.id ? 'A' : 'B'
      console.log(`\n📊 Group ${gname}:`)
      g.forEach(s => console.log(`  ${s.rank}. ${String(s.team_name).padEnd(25)} ${s.wins}W ${s.losses}L  勝点:${s.total_win_points}  R差:${s.round_diff}`))
    }
  }

  console.log(`\n✅ デモデータ投入完了`)
  console.log(`  ${SUPABASE_URL.replace('https://', 'https://katorin2.codenica.dev')}/tournaments/${tid}`)
  console.log(`  War: /tournaments/${tid}/wars`)
  console.log(`  順位: /tournaments/${tid}/standings`)
}

main().catch(err => { console.error('💥', err); process.exit(1) })
