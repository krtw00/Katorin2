'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TeamInviteWithTeam, isInviteValid } from '@/types/team'

export default function TeamInvitePage() {
  const t = useTranslations('team.invite')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<TeamInviteWithTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      if (!params.token || typeof params.token !== 'string') {
        setError(t('invalidToken'))
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      const token = typeof params.token === 'string' ? params.token : ''
      if (!token) {
        setError(t('invalidTokenShort'))
        setLoading(false)
        return
      }

      // 招待情報を取得
      const { data: inviteData, error: inviteError } = await supabase
        .from('team_invites')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('invite_token', token)
        .single()

      if (inviteError || !inviteData) {
        setError(t('notFound'))
        setLoading(false)
        return
      }

      setInvite(inviteData as TeamInviteWithTeam)

      // 既にメンバーかどうかチェック
      if (user) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', inviteData.team_id)
          .eq('user_id', user.id)
          .single()

        if (memberData) {
          setAlreadyMember(true)
        }
      }

      setLoading(false)
    }

    fetchInvite()
  }, [params.token, supabase])

  const handleJoin = async () => {
    if (!invite) return
    setJoining(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const token = typeof params.token === 'string' ? params.token : ''
    if (!user) {
      router.push(`/login?redirect=/teams/invite/${token}`)
      return
    }

    // 招待の有効性を再チェック
    if (!isInviteValid(invite)) {
      setError(t('expired'))
      setJoining(false)
      return
    }

    // メンバーとして追加
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      if (memberError.message.includes('duplicate') || memberError.message.includes('unique')) {
        setError(t('alreadyMember'))
      } else {
        setError(memberError.message)
      }
      setJoining(false)
      return
    }

    // 招待の使用回数を更新
    await supabase
      .from('team_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)

    setSuccess(true)
    setJoining(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/teams">
              <Button variant="outline">{t('backToList')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) return null

  const valid = isInviteValid(invite)

  // 成功画面
  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold">{t('joined')}</h2>
            <p className="text-muted-foreground">
              {t('joinedMessage', { teamName: invite.team.name })}
            </p>
            <Link href={`/teams/${invite.team_id}`}>
              <Button className="w-full">{t('goToTeam')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Info */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src={invite.team.avatar_url || undefined} alt={invite.team.name} />
              <AvatarFallback className="text-2xl">
                {invite.team.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{invite.team.name}</h2>
            {invite.team.description && (
              <p className="text-sm text-muted-foreground text-center">
                {invite.team.description}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Invalid Invite */}
          {!valid && (
            <div className="bg-muted px-4 py-3 rounded text-center">
              <p className="text-muted-foreground">
                {t('expired')}
              </p>
            </div>
          )}

          {/* Already Member */}
          {alreadyMember && (
            <div className="bg-muted px-4 py-3 rounded text-center">
              <p className="text-muted-foreground mb-3">
                {t('alreadyMember')}
              </p>
              <Link href={`/teams/${invite.team_id}`}>
                <Button variant="outline">{t('goToTeam')}</Button>
              </Link>
            </div>
          )}

          {/* Action */}
          {valid && !alreadyMember && (
            <>
              {isLoggedIn ? (
                <Button
                  className="w-full"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? t('joining') : t('join')}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('loginRequired')}
                  </p>
                  <Link href={`/login?redirect=/teams/invite/${params.token}`}>
                    <Button className="w-full">{t('loginToJoin')}</Button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Invite Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>{t('expiresAtLabel')}: {new Date(invite.expires_at).toLocaleDateString('ja-JP')}</p>
            <p>{t('remainingUses')}: {invite.max_uses - invite.use_count}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
