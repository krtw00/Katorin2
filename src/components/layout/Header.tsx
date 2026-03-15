'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Trophy, Layers, Users, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/tournaments', icon: Trophy, labelKey: 'tournaments' as const },
  { href: '/series', icon: Layers, labelKey: 'series' as const },
  { href: '/teams', icon: Users, labelKey: 'teams' as const },
  { href: '/my', icon: User, labelKey: 'mypage' as const, authOnly: true },
]

export function Header() {
  const t = useTranslations('nav')
  const { profile, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedPath = pathname.replace(/^\/(ja|en)/, '') || '/'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/tournaments" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-6 w-6" />
            <span className="text-lg font-bold">Katorin2</span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {NAV_LINKS.map(({ href, icon: Icon, labelKey, authOnly }) => {
              if (authOnly && !isAuthenticated) return null
              const isActive = normalizedPath.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {isAuthenticated && profile ? (
            <>
              <Link href="/my" className="hidden md:block">
                <div className="flex items-center gap-2 hover:opacity-80">
                  <Avatar className="h-7 w-7">
                    {profile.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="" />
                    )}
                    <AvatarFallback className="text-xs">
                      {profile.display_name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden lg:inline">
                    {profile.display_name}
                  </span>
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:inline-flex">
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/register" className="hidden sm:block">
                <Button size="sm">{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
