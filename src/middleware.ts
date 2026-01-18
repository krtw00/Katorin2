import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // 以下のパスを除外:
  // - /api, /trpc, /_next, /_vercel で始まるパス
  // - ドットを含むパス (favicon.ico 等)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
