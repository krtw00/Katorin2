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
  LeagueFormData,
} from '@/types/league'
import { type LeagueConfig } from '@/lib/schemas/league-config'
import { uploadTournamentCover, isUploadError } from '@/lib/supabase/storage'
import { useTranslations } from 'next-intl'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: () => void
}

export function LeagueForm({ mode, initialData, onSuccess }: Props) {
  const t = useTranslations('leagues.form')
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.cover_image_url || null)

  // ルール変更ロック: recruiting以降はロック
  const lockedStatuses = ['recruiting', 'in_progress', 'completed']
  const isRuleLocked = mode === 'edit' && initialData?.status ? lockedStatuses.includes(initialData.status) : false
  const [ruleUnlocked, setRuleUnlocked] = useState(false)
  const rulesDisabled = isRuleLocked && !ruleUnlocked

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(initialData?.discord_webhook_url || '')
  const [webhookError, setWebhookError] = useState('')

  // カスタムルール設定
  const initialConfig = initialData?.league_config as LeagueConfig | null
  const [customConfig, setCustomConfig] = useState({
    qualifierFormat: initialConfig?.qualifierFormat || 'round_robin' as 'round_robin' | 'swiss',
    orderSize: initialConfig?.orderSize || 3,
    subCount: initialConfig?.subCount || 1,
    playersPerRound: initialConfig?.playersPerRound || 3,
    matchFormat: initialConfig?.matchFormat || 'bo3' as 'bo1' | 'bo3' | 'bo5',
    blockCount: initialConfig?.blockCount || 1,
    roundsToWin: initialConfig?.roundsToWin || 2,
    banPickEnabled: initialConfig?.banPickEnabled || false,
    duplicateThemeAllowed: initialConfig?.duplicateThemeAllowed ?? true,
    winPoints: initialConfig?.scoring?.winPoints || 3,
  })

  const [formData, setFormData] = useState<LeagueFormData>(() => {
    if (initialData) {
      return {
        title: initialData.title,
        description: initialData.description || '',
      }
    }
    return {
      title: '',
      description: '',
    }
  })

  const updateFormData = (field: keyof LeagueFormData, value: LeagueFormData[keyof LeagueFormData]) => {
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

      const seriesConfig = {
        qualifierFormat: customConfig.qualifierFormat,
        orderSize: customConfig.orderSize,
        subCount: customConfig.subCount,
        playersPerRound: customConfig.playersPerRound,
        matchFormat: customConfig.matchFormat,
        blockCount: customConfig.blockCount,
        roundsToWin: customConfig.roundsToWin,
        banPickEnabled: customConfig.banPickEnabled,
        duplicateThemeAllowed: customConfig.duplicateThemeAllowed,
        scoring: { winPoints: customConfig.winPoints, lossPoints: 0, tiebreakers: [] },
      }

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
        entry_type: 'team' as const,
        visibility: 'public' as const,
        status: (asDraft ? 'draft' : 'in_progress') as 'draft' | 'in_progress',
        league_config: seriesConfig,
        cover_image_url: coverUrl,
        discord_webhook_url: trimmedWebhookUrl || null,
      }

      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('leagues')
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

        router.push(`/leagues/${data.id}`)
      } else {
        const { data, error: updateError } = await supabase
          .from('leagues')
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
          router.push(`/leagues/${data.id}`)
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
              <CardTitle className="text-lg">{t('coverImage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={coverUrl}
                onChange={(url) => setCoverUrl(url)}
                onUpload={async (file) => {
                  const { data: { user: u } } = await supabase.auth.getUser()
                  if (!u) throw new Error(t('loginRequired'))
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
                {t('coverImageHint')}
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

          {/* ルール設定 */}
          {(
            <>
              {/* ロック警告 */}
              {isRuleLocked && (
                <Card className={ruleUnlocked ? 'border-yellow-500' : 'border-destructive/50'}>
                  <CardContent className="p-4">
                    {!ruleUnlocked ? (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{t('ruleLocked')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('ruleLockedDesc')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => setRuleUnlocked(true)}
                        >
                          {t('unlockRules')}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-yellow-600">{t('ruleUnlocked')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('ruleUnlockedDesc')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 大会形式 */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{t('tournamentFormat')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>{t('qualifierFormat')}</Label>
                    <p className="text-xs text-muted-foreground">{t('qualifierFormatHint')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'round_robin', label: t('roundRobin'), desc: t('roundRobinDesc') },
                        { value: 'swiss', label: t('swissDraw'), desc: t('swissDrawDesc') },
                      ].map(opt => (
                        <label key={opt.value} className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${customConfig.qualifierFormat === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="qualifierFormat" value={opt.value}
                              checked={customConfig.qualifierFormat === opt.value}
                              onChange={() => setCustomConfig(c => ({ ...c, qualifierFormat: opt.value as 'round_robin' | 'swiss' }))}
                              className="w-4 h-4" />
                            <span className="font-medium text-sm">{opt.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-6">{opt.desc}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('matchFormat')}</Label>
                    <p className="text-xs text-muted-foreground">{t('matchFormatHint')}</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'bo1', label: 'BO1', desc: t('bo1Desc') },
                        { value: 'bo3', label: 'BO3', desc: t('bo3Desc') },
                        { value: 'bo5', label: 'BO5', desc: t('bo5Desc') },
                      ].map(opt => (
                        <label key={opt.value} className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-colors ${customConfig.matchFormat === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                          <input type="radio" name="matchFormat" value={opt.value}
                            checked={customConfig.matchFormat === opt.value}
                            onChange={() => setCustomConfig(c => ({ ...c, matchFormat: opt.value as 'bo1' | 'bo3' | 'bo5' }))}
                            className="sr-only" />
                          <span className="font-bold text-lg">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {customConfig.qualifierFormat === 'round_robin' && (
                    <div className="space-y-2">
                      <Label>{t('blockCount')}</Label>
                      <p className="text-xs text-muted-foreground">{t('blockCountHint')}</p>
                      <Input type="number" min={1} max={8} value={customConfig.blockCount}
                        onChange={e => setCustomConfig(c => ({ ...c, blockCount: +e.target.value }))} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* チーム構成 */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{t('teamComposition')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t('orderSize')}</Label>
                      <p className="text-xs text-muted-foreground">{t('orderSizeHint')}</p>
                      <Input type="number" min={1} max={10} value={customConfig.orderSize}
                        onChange={e => setCustomConfig(c => ({ ...c, orderSize: +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('subCount')}</Label>
                      <p className="text-xs text-muted-foreground">{t('subCountHint')}</p>
                      <Input type="number" min={0} max={5} value={customConfig.subCount}
                        onChange={e => setCustomConfig(c => ({ ...c, subCount: +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('playersPerRound')}</Label>
                      <p className="text-xs text-muted-foreground">{t('playersPerRoundHint')}</p>
                      <Input type="number" min={1} max={10} value={customConfig.playersPerRound}
                        onChange={e => setCustomConfig(c => ({ ...c, playersPerRound: +e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('roundsToWin')}</Label>
                    <p className="text-xs text-muted-foreground">{t('roundsToWinHint')}</p>
                    <Input type="number" min={1} max={5} value={customConfig.roundsToWin}
                      onChange={e => setCustomConfig(c => ({ ...c, roundsToWin: +e.target.value }))}
                      className="max-w-[120px]" />
                  </div>
                </CardContent>
              </Card>

              {/* スコアリング */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{t('scoring')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>{t('winPointsLabel')}</Label>
                    <p className="text-xs text-muted-foreground">{t('winPointsHint')}</p>
                    <Input type="number" min={1} max={10} value={customConfig.winPoints}
                      onChange={e => setCustomConfig(c => ({ ...c, winPoints: +e.target.value }))}
                      className="max-w-[120px]" />
                  </div>
                </CardContent>
              </Card>

              {/* オプションルール */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{t('options')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={customConfig.banPickEnabled}
                      onChange={e => setCustomConfig(c => ({ ...c, banPickEnabled: e.target.checked }))}
                      className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{t('enableBanPick')}</div>
                      <p className="text-xs text-muted-foreground">{t('enableBanPickHint')}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={customConfig.duplicateThemeAllowed}
                      onChange={e => setCustomConfig(c => ({ ...c, duplicateThemeAllowed: e.target.checked }))}
                      className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{t('allowDuplicateTheme')}</div>
                      <p className="text-xs text-muted-foreground">{t('allowDuplicateThemeHint')}</p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </>
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
