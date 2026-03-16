import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Discord OAuth の場合、discord_id を自動保存
      const provider = data.user.app_metadata?.provider
      if (provider === 'discord') {
        const meta = data.user.user_metadata
        const discordUsername =
          meta?.custom_claims?.global_name ||
          meta?.full_name ||
          meta?.name ||
          null

        if (discordUsername) {
          await supabase
            .from('profiles')
            .update({ discord_id: discordUsername })
            .eq('id', data.user.id)
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/tournaments`)
}
