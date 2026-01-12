'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Header() {
  const { user, profile, isAuthenticated, signOut } = useAuth()
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
              大会一覧
            </Link>
            {isAuthenticated && (
              <Link
                href="/my"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                マイページ
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated && profile ? (
            <>
              <Link href="/my">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                  <Avatar className="h-8 w-8">
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
                ログアウト
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  ログイン
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">新規登録</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
