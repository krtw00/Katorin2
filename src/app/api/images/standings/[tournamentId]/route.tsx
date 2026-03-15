import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

type ThemeConfig = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgColor: string
  textColor: string
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#f59e0b',
  bgColor: '#0f172a',
  textColor: '#f8fafc',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get('block')

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('title, theme_config, tournament_format')
    .eq('id', tournamentId)
    .single()

  if (!tournament) return new Response('Not found', { status: 404 })

  const theme = { ...defaultTheme, ...((tournament.theme_config as ThemeConfig) || {}) }

  // ブロック名
  let blockName = ''
  if (blockId) {
    const { data: block } = await supabase
      .from('tournament_blocks')
      .select('block_name')
      .eq('id', blockId)
      .single()
    blockName = block?.block_name || ''
  }

  // 順位データ取得
  type Standing = {
    team_name: string
    wins: number
    losses: number
    total_win_points: number
    round_diff: number
    match_diff: number
    rank: number
  }

  let standings: Standing[] = []

  if (tournament.tournament_format === 'round_robin') {
    let query = supabase.from('block_standings').select('*').eq('tournament_id', tournamentId)
    if (blockId) query = query.eq('block_id', blockId)
    const { data } = await query
    standings = (data || []).sort((a, b) => a.rank - b.rank) as Standing[]
  } else {
    const { data } = await supabase
      .from('swiss_rankings')
      .select('*')
      .eq('tournament_id', tournamentId)
    standings = (data || []).sort((a, b) => a.rank - b.rank).map(s => ({
      team_name: s.team_name,
      wins: 0,
      losses: 0,
      total_win_points: s.total_team_points,
      round_diff: s.total_win_points,
      match_diff: 0,
      rank: s.rank,
    })) as Standing[]
  }

  const rowHeight = 44
  const headerHeight = 120
  const tableHeaderHeight = 40
  const footerHeight = 40
  const height = Math.max(400, headerHeight + tableHeaderHeight + standings.length * rowHeight + footerHeight + 40)

  return new ImageResponse(
    (
      <div style={{
        width: '800px',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.bgColor,
        color: theme.textColor,
        fontFamily: 'sans-serif',
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px',
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
        }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex' }}>
            {tournament.title}
          </span>
          <span style={{ fontSize: '16px', marginTop: '4px', opacity: 0.8, display: 'flex' }}>
            {blockName || '順位表'}
          </span>
        </div>

        {/* テーブル */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 24px' }}>
          {/* ヘッダー行 */}
          <div style={{
            display: 'flex',
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#94a3b8',
          }}>
            <span style={{ width: '40px', display: 'flex' }}>#</span>
            <span style={{ flex: 1, display: 'flex' }}>チーム</span>
            <span style={{ width: '50px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>勝</span>
            <span style={{ width: '50px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>敗</span>
            <span style={{ width: '60px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>勝点</span>
            <span style={{ width: '70px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>R差</span>
            <span style={{ width: '70px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>M差</span>
          </div>

          {/* データ行 */}
          {standings.map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              padding: '10px 12px',
              backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
              borderLeft: s.rank <= 2 ? `3px solid ${theme.accentColor}` : '3px solid transparent',
              fontSize: '16px',
              alignItems: 'center',
            }}>
              <span style={{
                width: '40px', fontWeight: 'bold', display: 'flex',
                color: s.rank <= 1 ? theme.accentColor : s.rank <= 3 ? '#94a3b8' : '#64748b',
              }}>
                {s.rank}
              </span>
              <span style={{ flex: 1, fontWeight: 'bold', display: 'flex' }}>
                {s.team_name}
              </span>
              <span style={{ width: '50px', textAlign: 'center', display: 'flex', justifyContent: 'center', fontFamily: 'monospace' }}>
                {s.wins}
              </span>
              <span style={{ width: '50px', textAlign: 'center', display: 'flex', justifyContent: 'center', fontFamily: 'monospace' }}>
                {s.losses}
              </span>
              <span style={{ width: '60px', textAlign: 'center', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}>
                {s.total_win_points}
              </span>
              <span style={{
                width: '70px', textAlign: 'center', fontFamily: 'monospace', display: 'flex', justifyContent: 'center',
                color: s.round_diff > 0 ? '#4ade80' : s.round_diff < 0 ? '#f87171' : theme.textColor,
              }}>
                {s.round_diff > 0 ? '+' : ''}{s.round_diff}
              </span>
              <span style={{
                width: '70px', textAlign: 'center', fontFamily: 'monospace', display: 'flex', justifyContent: 'center',
                color: s.match_diff > 0 ? '#4ade80' : s.match_diff < 0 ? '#f87171' : theme.textColor,
              }}>
                {s.match_diff > 0 ? '+' : ''}{s.match_diff}
              </span>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div style={{
          display: 'flex', justifyContent: 'center', padding: '12px',
          fontSize: '11px', color: '#475569', marginTop: 'auto',
        }}>
          Powered by Katorin
        </div>
      </div>
    ),
    { width: 800, height }
  )
}
