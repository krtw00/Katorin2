'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export function Header() {
  const t = useTranslations('nav')
  const { profile, isAuthenticated, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/tournaments">
            <h1 className="text-xl font-bold cursor-pointer">Katorin</h1>
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link
              href="/tournaments"
              className="text-sm font-medium hover:text-primary"
            >
              {t('tournaments')}
            </Link>
            <Link
              href="/series"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {t('series')}
            </Link>
            <Link
              href="/teams"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {t('teams')}
            </Link>
            {isAuthenticated && (
              <Link
                href="/my"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {t('mypage')}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {isAuthenticated && profile ? (
            <>
              <Link href="/my">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                  <Avatar className="h-8 w-8">
                    {profile.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="" />
                    )}
                    <AvatarFallback>
                      {profile.display_name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">
                    {profile.display_name}
                  </span>
                </div>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
