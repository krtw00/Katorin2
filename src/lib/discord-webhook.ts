type DiscordEmbed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

type DiscordWebhookPayload = {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

// Katorin ブランドカラー (水色系)
const KATORIN_COLOR = 0x38bdf8

export type WebhookEvent =
  | 'recruiting_started'
  | 'bracket_published'
  | 'tournament_completed'
  | 'round_started'

const EVENT_COLORS: Record<WebhookEvent, number> = {
  recruiting_started: 0x22c55e,   // green
  bracket_published: 0x3b82f6,    // blue
  tournament_completed: 0xeab308, // yellow
  round_started: KATORIN_COLOR,
}

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === 'discord.com' &&
      parsed.pathname.startsWith('/api/webhooks/')
    )
  } catch {
    return false
  }
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  event: WebhookEvent,
  data: {
    title: string
    description?: string
    url?: string
    fields?: { name: string; value: string; inline?: boolean }[]
  }
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
    return { success: false, error: 'Invalid webhook URL' }
  }

  const embed: DiscordEmbed = {
    title: data.title,
    description: data.description,
    url: data.url,
    color: EVENT_COLORS[event] ?? KATORIN_COLOR,
    fields: data.fields,
    footer: { text: 'Katorin2' },
    timestamp: new Date().toISOString(),
  }

  const payload: DiscordWebhookPayload = {
    username: 'Katorin2',
    embeds: [embed],
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, error: `Discord API error ${res.status}: ${text}` }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export function validateWebhookUrl(url: string): boolean {
  if (!url) return true // empty is allowed (optional)
  return isValidWebhookUrl(url)
}
