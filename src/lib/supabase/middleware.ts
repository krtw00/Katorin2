import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  // next-intlなど他のmiddlewareからのresponseがあればそれを使用
  let supabaseResponse = response ?? NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ロケールプレフィックスを考慮したパスチェック
  // /my, /en/my, /ja/my などにマッチ
  const isProtectedRoute = /^(\/(?:ja|en))?\/my(\/|$)/.test(pathname)
  const isAuthPage = /^(\/(?:ja|en))?\/(login|register)$/.test(pathname)

  // Protected routes - redirect to login if not authenticated
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    // ロケールプレフィックスを保持してリダイレクト
    const localeMatch = pathname.match(/^\/(?:ja|en)/)
    url.pathname = localeMatch ? `${localeMatch[0]}/login` : '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    const localeMatch = pathname.match(/^\/(?:ja|en)/)
    url.pathname = localeMatch ? `${localeMatch[0]}/tournaments` : '/tournaments'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
