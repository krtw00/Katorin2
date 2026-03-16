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
import { type SeriesConfig } from '@/lib/schemas/series-config'
import { uploadTournamentCover, isUploadError } from '@/lib/supabase/storage'
import { useTranslations } from 'next-intl'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: () => void
}

export function SeriesForm({ mode, initialData, onSuccess }: Props) {
  const t = useTranslations('series.form')
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
  const initialConfig = initialData?.series_config as SeriesConfig | null
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

  const [formData, setFormData] = useState<SeriesFormData>(() => {
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
                          <p className="text-sm font-medium">ルール設定はロックされています</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            大会が進行中のため、ルール変更は制限されています。変更すると進行中の結果に影響する可能性があります。
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => setRuleUnlocked(true)}
                        >
                          ロック解除
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-yellow-600">ルールロックが解除されました</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          変更内容は保存時に反映されます。進行中の結果には自動で反映されません。
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 大会形式 */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">大会形式</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>予選フォーマット</Label>
                    <p className="text-xs text-muted-foreground">チーム間の対戦方式を選択します</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'round_robin', label: '総当たり', desc: 'ブロック内の全チームと対戦' },
                        { value: 'swiss', label: 'スイスドロー', desc: '勝敗が近いチーム同士をマッチング' },
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
                    <Label>個人マッチ形式</Label>
                    <p className="text-xs text-muted-foreground">1つの個人対戦での勝敗判定方式</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'bo1', label: 'BO1', desc: '1本勝負' },
                        { value: 'bo3', label: 'BO3', desc: '2本先取' },
                        { value: 'bo5', label: 'BO5', desc: '3本先取' },
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
                      <Label>ブロック数</Label>
                      <p className="text-xs text-muted-foreground">チームを振り分けるグループの数</p>
                      <Input type="number" min={1} max={8} value={customConfig.blockCount}
                        onChange={e => setCustomConfig(c => ({ ...c, blockCount: +e.target.value }))} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* チーム構成 */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">チーム構成</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>オーダー人数</Label>
                      <p className="text-xs text-muted-foreground">提出するオーダーの総人数</p>
                      <Input type="number" min={1} max={10} value={customConfig.orderSize}
                        onChange={e => setCustomConfig(c => ({ ...c, orderSize: +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>サブ人数</Label>
                      <p className="text-xs text-muted-foreground">オーダー内のサブ枠</p>
                      <Input type="number" min={0} max={5} value={customConfig.subCount}
                        onChange={e => setCustomConfig(c => ({ ...c, subCount: +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>1ラウンド出場数</Label>
                      <p className="text-xs text-muted-foreground">各ラウンドで対戦する人数</p>
                      <Input type="number" min={1} max={10} value={customConfig.playersPerRound}
                        onChange={e => setCustomConfig(c => ({ ...c, playersPerRound: +e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>先取ラウンド数</Label>
                    <p className="text-xs text-muted-foreground">War（チーム対戦）で何ラウンド先取で勝利とするか</p>
                    <Input type="number" min={1} max={5} value={customConfig.roundsToWin}
                      onChange={e => setCustomConfig(c => ({ ...c, roundsToWin: +e.target.value }))}
                      className="max-w-[120px]" />
                  </div>
                </CardContent>
              </Card>

              {/* スコアリング */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">スコアリング</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>勝利ポイント</Label>
                    <p className="text-xs text-muted-foreground">War勝利時に獲得するポイント（順位表のランキングに使用）</p>
                    <Input type="number" min={1} max={10} value={customConfig.winPoints}
                      onChange={e => setCustomConfig(c => ({ ...c, winPoints: +e.target.value }))}
                      className="max-w-[120px]" />
                  </div>
                </CardContent>
              </Card>

              {/* オプションルール */}
              <Card className={rulesDisabled ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">オプション</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={customConfig.banPickEnabled}
                      onChange={e => setCustomConfig(c => ({ ...c, banPickEnabled: e.target.checked }))}
                      className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Ban & Pick を有効にする</div>
                      <p className="text-xs text-muted-foreground">オーダー提出後に対戦メンバーのBan/Pickフェーズを設ける</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={customConfig.duplicateThemeAllowed}
                      onChange={e => setCustomConfig(c => ({ ...c, duplicateThemeAllowed: e.target.checked }))}
                      className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">デッキテーマ重複を許可</div>
                      <p className="text-xs text-muted-foreground">同一チーム内で同じデッキテーマの使用を許可する</p>
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
