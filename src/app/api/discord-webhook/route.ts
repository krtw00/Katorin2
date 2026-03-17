import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDiscordWebhook, type WebhookEvent } from '@/lib/discord-webhook'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event, tournamentId, leagueId } = body as {
      event: WebhookEvent
      tournamentId?: string
      leagueId?: string
    }

    if (!event) {
      return NextResponse.json({ error: 'Missing event' }, { status: 400 })
    }

    let webhookUrl: string | null = null
    let title = ''
    let description = ''
    let pageUrl = ''

    const origin = new URL(request.url).origin

    if (tournamentId) {
      const { data: tournament } = await supabase
        .from('rounds')
        .select('*, series:league_id(discord_webhook_url, title)')
        .eq('id', tournamentId)
        .single()

      if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      // 主催者チェック
      if (tournament.organizer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // 大会自体のwebhook_urlを優先、なければシリーズのwebhook_urlを使用
      const seriesData = tournament.series as { discord_webhook_url: string | null; title: string } | null
      webhookUrl = tournament.discord_webhook_url || seriesData?.discord_webhook_url || null
      title = tournament.title
      pageUrl = `${origin}/tournaments/${tournament.id}`

      switch (event) {
        case 'recruiting_started':
          description = 'エントリー受付を開始しました'
          break
        case 'bracket_published':
          description = 'トーナメント表が公開されました'
          break
        case 'tournament_completed':
          description = '大会が終了しました'
          break
        case 'round_started':
          description = `ラウンド ${tournament.current_round ?? ''} が開始されました`
          break
      }
    } else if (leagueId) {
      const { data: league } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (!league) {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }

      if (league.organizer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      webhookUrl = league.discord_webhook_url
      title = league.title
      pageUrl = `${origin}/leagues/${league.id}`
    }

    if (!webhookUrl) {
      return NextResponse.json({ message: 'No webhook URL configured' }, { status: 200 })
    }

    const result = await sendDiscordWebhook(webhookUrl, event, {
      title: `${title}`,
      description,
      url: pageUrl,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Discord webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
