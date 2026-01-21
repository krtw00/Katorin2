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
import { ImageUpload } from '@/components/ui/image-upload'
import { uploadUserAvatar, isUploadError } from '@/lib/supabase/storage'
import { Profile } from '@/types/tournament'
import { useTranslations } from 'next-intl'

export default function ProfileEditPage() {
  const t = useTranslations('mypage.edit')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [discordId, setDiscordId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

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
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || null)
      setDiscordId(data.discord_id || '')
      setLoading(false)
    }

    loadProfile()
  }, [router, t])

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
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          discord_id: discordId.trim() || null,
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
            {/* Avatar */}
            <div className="space-y-2">
              <Label>{t('avatar')}</Label>
              <ImageUpload
                value={avatarUrl}
                onChange={setAvatarUrl}
                onUpload={async (file) => {
                  if (!userId) throw new Error(t('loginRequired'))
                  const supabase = createClient()
                  const result = await uploadUserAvatar(supabase, file, userId)
                  if (isUploadError(result)) throw new Error(result.message)
                  return result.url
                }}
                shape="circle"
                size="lg"
              />
              <p className="text-xs text-muted-foreground">
                {t('avatarHint')}
              </p>
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

            {/* Discord ID */}
            <div className="space-y-2">
              <Label htmlFor="discordId">{t('discordId')}</Label>
              <Input
                id="discordId"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder={t('discordIdPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('discordIdHelp')}
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
