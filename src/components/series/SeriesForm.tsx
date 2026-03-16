'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  Series,
  SeriesFormData,
} from '@/types/series'
import { WMGP_CONFIG, ROCKET_CUP_CONFIG } from '@/lib/schemas/series-config'
import { uploadTournamentCover, isUploadError } from '@/lib/supabase/storage'
import { useTranslations } from 'next-intl'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: () => void
}

export function SeriesForm({ mode, initialData, onSuccess }: Props) {
  const t = useTranslations('series.form')
  const tEntryType = useTranslations('series.entryType')
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.cover_image_url || null)

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(initialData?.discord_webhook_url || '')
  const [webhookError, setWebhookError] = useState('')

  const [formData, setFormData] = useState<SeriesFormData>(() => {
    if (initialData) {
      return {
        title: initialData.title,
        description: initialData.description || '',
        entry_type: initialData.entry_type,
        config_preset: 'custom',
      }
    }
    return {
      title: '',
      description: '',
      entry_type: 'team',
      config_preset: 'wmgp',
    }
  })

  const updateFormData = (field: keyof SeriesFormData, value: SeriesFormData[keyof SeriesFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError(t('loginRequired'))
        return
      }

      // Validation
      if (!formData.title.trim()) {
        setError(t('nameRequired'))
        return
      }

      const configPresets = { wmgp: WMGP_CONFIG, rocket_cup: ROCKET_CUP_CONFIG, custom: {} }
      const seriesConfig = configPresets[formData.config_preset] || {}

      // Webhook URL validation
      const trimmedWebhookUrl = discordWebhookUrl.trim()
      if (trimmedWebhookUrl && !trimmedWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        setWebhookError(t('webhookInvalid'))
        setLoading(false)
        return
      }
      setWebhookError('')

      const seriesData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        entry_type: formData.entry_type as 'individual' | 'team',
        status: (asDraft ? 'draft' : 'in_progress') as 'draft' | 'in_progress',
        series_config: seriesConfig,
        cover_image_url: coverUrl,
        discord_webhook_url: trimmedWebhookUrl || null,
      }

      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('series')
          .insert({
            ...seriesData,
            organizer_id: user.id,
          })
          .select()
          .single()

        if (insertError) {
          setError(insertError.message)
          return
        }

        router.push(`/series/${data.id}`)
      } else {
        const { data, error: updateError } = await supabase
          .from('series')
          .update(seriesData)
          .eq('id', initialData!.id)
          .select()
          .single()

        if (updateError) {
          setError(updateError.message)
          return
        }

        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/series/${data.id}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              {t('back')}
            </Button>
            <h1 className="text-lg font-bold">
              {mode === 'create' ? t('createTitle') : t('editTitle')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
            >
              {t('saveDraft')}
            </Button>
            <Button
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
            >
              {loading ? t('saving') : mode === 'edit' ? t('saveChanges') : t('createTitle')}
            </Button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">カバー画像</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={coverUrl}
                onChange={(url) => setCoverUrl(url)}
                onUpload={async (file) => {
                  const { data: { user: u } } = await supabase.auth.getUser()
                  if (!u) throw new Error('ログインが必要です')
                  const result = await uploadTournamentCover(supabase, file, u.id)
                  if (isUploadError(result)) throw new Error(result.message)
                  return result.url
                }}
                shape="square"
                size="lg"
                accept="image/jpeg,image/png,image/gif"
                maxSizeMB={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, GIF形式、5MB以下、16:9推奨
              </p>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('nameLabel')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder={t('namePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Entry Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('entryTypeLabel')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entry_type"
                    value="individual"
                    checked={formData.entry_type === 'individual'}
                    onChange={() => updateFormData('entry_type', 'individual')}
                    className="w-4 h-4"
                  />
                  <span>{tEntryType('individual')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entry_type"
                    value="team"
                    checked={formData.entry_type === 'team'}
                    onChange={() => updateFormData('entry_type', 'team')}
                    className="w-4 h-4"
                  />
                  <span>{tEntryType('team')}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Config Preset (チーム戦のみ) */}
          {formData.entry_type === 'team' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ルール設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { value: 'wmgp' as const, label: 'WMGP形式', desc: '3v3星取戦(BO3) / ブロック別総当たり / 3メイン+1サブ' },
                  { value: 'rocket_cup' as const, label: 'ロケットカップ形式', desc: '5人Ban&Pick→3v3 / スイスドロー / デッキテーマ被り禁止' },
                  { value: 'custom' as const, label: 'カスタム', desc: '後から手動で設定' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="config_preset"
                      value={opt.value}
                      checked={formData.config_preset === opt.value}
                      onChange={() => updateFormData('config_preset', opt.value)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-sm text-muted-foreground">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}
          {/* Discord Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('webhookLabel')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                id="discord_webhook_url"
                value={discordWebhookUrl}
                onChange={(e) => {
                  setDiscordWebhookUrl(e.target.value)
                  setWebhookError('')
                }}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-muted-foreground">
                {t('webhookHint')}
              </p>
              {webhookError && (
                <p className="text-xs text-destructive">{webhookError}</p>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
