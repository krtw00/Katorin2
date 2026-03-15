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
  fontFamily: string
  backgroundImage: string | null
  logoUrl: string | null
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#f59e0b',
  bgColor: '#0f172a',
  textColor: '#f8fafc',
  fontFamily: 'sans-serif',
  backgroundImage: null,
  logoUrl: null,
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = createClient(supabaseUrl, supabaseKey)

  // War(match)データ取得
  const { data: match } = await supabase
    .from('matches')
    .select('*, tournament:tournaments(*)')
    .eq('id', matchId)
    .single()

  if (!match) {
    return new Response('Match not found', { status: 404 })
  }

  // チーム名取得
  const [{ data: team1 }, { data: team2 }] = await Promise.all([
    supabase.from('teams').select('name').eq('id', match.team1_id).single(),
    supabase.from('teams').select('name').eq('id', match.team2_id).single(),
  ])

  // ラウンド結果
  const { data: warRounds } = await supabase
    .from('war_rounds')
    .select('*')
    .eq('match_id', matchId)
    .order('round_number', { ascending: true })

  // 個別試合
  const { data: individualMatches } = await supabase
    .from('individual_matches')
    .select('*, player1:profiles!individual_matches_player1_id_fkey(display_name), player2:profiles!individual_matches_player2_id_fkey(display_name)')
    .eq('match_id', matchId)
    .order('play_order', { ascending: true })

  // テーマ設定
  const tournament = match.tournament as { title: string; theme_config: ThemeConfig } | null
  const theme = { ...defaultTheme, ...((tournament?.theme_config as ThemeConfig) || {}) }

  const team1Name = team1?.name || 'Team 1'
  const team2Name = team2?.name || 'Team 2'
  const isTeam1Winner = match.winner_team_id === match.team1_id

  // ラウンドごとの試合をグループ化
  const roundGroups = (warRounds || []).map(wr => ({
    roundNumber: wr.round_number,
    t1Wins: wr.team1_match_wins,
    t2Wins: wr.team2_match_wins,
    winnerId: wr.winner_team_id,
    matches: (individualMatches || []).filter(im => im.war_round_id === wr.id),
  }))

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.bgColor,
          color: theme.textColor,
          fontFamily: theme.fontFamily,
          padding: '0',
          position: 'relative',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 40px',
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 'bold', display: 'flex' }}>
            {tournament?.title || 'Tournament'}
          </div>
        </div>

        {/* チーム名 & スコア */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 40px',
            gap: '40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: '24px', fontWeight: 'bold',
              color: isTeam1Winner ? theme.accentColor : theme.textColor,
            }}>
              {team1Name}
            </span>
            {isTeam1Winner && (
              <span style={{ fontSize: '14px', color: theme.accentColor, marginTop: '4px', display: 'flex' }}>WIN</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {match.team1_round_wins}
            </span>
            <span style={{ fontSize: '32px', color: '#64748b', display: 'flex' }}>-</span>
            <span style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {match.team2_round_wins}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: '24px', fontWeight: 'bold',
              color: !isTeam1Winner ? theme.accentColor : theme.textColor,
            }}>
              {team2Name}
            </span>
            {!isTeam1Winner && (
              <span style={{ fontSize: '14px', color: theme.accentColor, marginTop: '4px', display: 'flex' }}>WIN</span>
            )}
          </div>
        </div>

        {/* ラウンド結果テーブル */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 40px', gap: '16px', flex: 1 }}>
          {roundGroups.map((round) => (
            <div key={round.roundNumber} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* ラウンドヘッダー */}
              <div style={{
                display: 'flex', justifyContent: 'center', padding: '6px',
                backgroundColor: theme.secondaryColor, borderRadius: '4px 4px 0 0',
                fontSize: '14px', fontWeight: 'bold',
              }}>
                ROUND {round.roundNumber}
                <span style={{ marginLeft: '16px', display: 'flex' }}>
                  {round.t1Wins} - {round.t2Wins}
                </span>
              </div>

              {/* 各マッチ */}
              {round.matches.map((im, idx) => {
                const p1 = im.player1 as { display_name: string } | { display_name: string }[]
                const p2 = im.player2 as { display_name: string } | { display_name: string }[]
                const p1Name = Array.isArray(p1) ? p1[0]?.display_name : p1?.display_name
                const p2Name = Array.isArray(p2) ? p2[0]?.display_name : p2?.display_name
                const p1Won = im.winner_id === im.player1_id

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                      padding: '8px 16px',
                      fontSize: '16px',
                    }}
                  >
                    <span style={{
                      flex: 1, textAlign: 'right',
                      fontWeight: p1Won ? 'bold' : 'normal',
                      color: p1Won ? '#4ade80' : theme.textColor,
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      {p1Name || 'Player 1'}
                    </span>
                    <span style={{
                      width: '80px', textAlign: 'center', fontWeight: 'bold',
                      fontFamily: 'monospace', display: 'flex', justifyContent: 'center',
                    }}>
                      {im.player1_score} - {im.player2_score}
                    </span>
                    <span style={{
                      flex: 1,
                      fontWeight: !p1Won ? 'bold' : 'normal',
                      color: !p1Won ? '#4ade80' : theme.textColor,
                      display: 'flex',
                    }}>
                      {p2Name || 'Player 2'}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div style={{
          display: 'flex', justifyContent: 'center', padding: '12px',
          fontSize: '12px', color: '#64748b',
        }}>
          Powered by Katorin
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  )
}
