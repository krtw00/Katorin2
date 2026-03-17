'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Trophy, Layers, Users, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/tournaments', icon: Trophy, labelKey: 'tournaments' as const },
  { href: '/leagues', icon: Layers, labelKey: 'leagues' as const },
  { href: '/teams', icon: Users, labelKey: 'teams' as const },
  { href: '/my', icon: User, labelKey: 'mypage' as const },
]

export function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  // ロケールプレフィックスを除去してパスを比較
  const normalizedPath = pathname.replace(/^\/(ja|en)/, '') || '/'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div
        className="grid grid-cols-4 h-16"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive = normalizedPath.startsWith(href)
          const needsAuth = labelKey === 'mypage' || labelKey === 'teams'
          const actualHref = needsAuth && !isAuthenticated ? '/login' : href

          return (
            <Link
              key={href}
              href={actualHref}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
