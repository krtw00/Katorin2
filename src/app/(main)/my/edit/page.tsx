'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Profile } from '@/types/tournament'
import { useTranslations } from 'next-intl'

export default function ProfileEditPage() {
  const t = useTranslations('mypage.edit')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [masterDuelId, setMasterDuelId] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(t('loadError'))
        setLoading(false)
        return
      }

      setProfile(data)
      setDisplayName(data.display_name || '')
      setMasterDuelId(data.master_duel_id || '')
      setBio(data.bio || '')
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!displayName.trim()) {
      setError(t('displayNameRequired'))
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError(t('loginRequired'))
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          master_duel_id: masterDuelId.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) {
        setError(t('updateError', { error: updateError.message }))
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/my')
      }, 1000)
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('loading')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {displayName.substring(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                {t('avatarNotice')}
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                {t('displayName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('displayNamePlaceholder')}
                maxLength={50}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('displayNameHelp')}
              </p>
            </div>

            {/* Master Duel ID */}
            <div className="space-y-2">
              <Label htmlFor="masterDuelId">{t('masterDuelId')}</Label>
              <Input
                id="masterDuelId"
                value={masterDuelId}
                onChange={(e) => setMasterDuelId(e.target.value)}
                placeholder="000-000-000"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                {t('masterDuelIdHelp')}
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">{t('bio')}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('bioPlaceholder')}
                rows={3}
              />
            </div>

            {/* Error / Success Messages */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                {t('saveSuccess')}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/my')}
              disabled={isPending}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : tCommon('save')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
