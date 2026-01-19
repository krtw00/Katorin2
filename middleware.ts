import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

// next-intl middleware
const handleI18nRouting = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ルートパス（/en, /ja, /）を /tournaments にリダイレクト
  if (pathname === '/' || pathname === '/en' || pathname === '/ja') {
    const url = request.nextUrl.clone()
    if (pathname === '/en') {
      url.pathname = '/en/tournaments'
    } else {
      url.pathname = '/tournaments'
    }
    return NextResponse.redirect(url)
  }

  // Step 1: next-intlでロケール処理
  const response = handleI18nRouting(request)

  // Step 2: Supabaseセッション更新（responseを渡す）
  return await updateSession(request, response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
