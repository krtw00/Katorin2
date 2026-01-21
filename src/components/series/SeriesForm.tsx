'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Series,
  SeriesFormData,
  PointSystem,
  PointCalculationMode,
  pointSystemLabels,
  pointCalculationModeLabels,
  defaultRankingPoints,
  defaultWinsPointConfig,
  RankingPointConfig,
  WinsPointConfig,
} from '@/types/series'
import { useTranslations } from 'next-intl'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: () => void
}

export function SeriesForm({ mode, initialData, onSuccess }: Props) {
  const t = useTranslations('series.form')
  const tEntryType = useTranslations('series.entryType')
  const tDetail = useTranslations('series.detail')
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<SeriesFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description || '',
        entry_type: initialData.entry_type,
        point_system: initialData.point_system,
        point_config: initialData.point_config,
        point_calculation_mode: initialData.point_calculation_mode || 'manual',
        start_date: initialData.start_date,
        end_date: initialData.end_date,
      }
    }
    return {
      name: '',
      description: '',
      entry_type: 'individual',
      point_system: 'ranking',
      point_config: defaultRankingPoints,
      point_calculation_mode: 'manual' as PointCalculationMode,
      start_date: null,
      end_date: null,
    }
  })

  const updateFormData = (field: keyof SeriesFormData, value: SeriesFormData[keyof SeriesFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePointSystemChange = (system: PointSystem) => {
    updateFormData('point_system', system)
    if (system === 'ranking') {
      updateFormData('point_config', defaultRankingPoints)
    } else {
      updateFormData('point_config', defaultWinsPointConfig)
    }
  }

  const handleSubmit = async (e: FormEvent, asDraft = false) => {
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
      if (!formData.name.trim()) {
        setError(t('nameRequired'))
        return
      }

      const seriesData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        entry_type: formData.entry_type,
        point_system: formData.point_system,
        point_config: formData.point_config as RankingPointConfig | WinsPointConfig,
        point_calculation_mode: formData.point_calculation_mode,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: (asDraft ? 'draft' : 'active') as 'draft' | 'active',
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
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('nameLabel')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
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

          {/* Point System */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('pointSystemLabel')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="point_system"
                    value="ranking"
                    checked={formData.point_system === 'ranking'}
                    onChange={() => handlePointSystemChange('ranking')}
                    className="w-4 h-4"
                  />
                  <span>{pointSystemLabels.ranking}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="point_system"
                    value="wins"
                    checked={formData.point_system === 'wins'}
                    onChange={() => handlePointSystemChange('wins')}
                    className="w-4 h-4"
                  />
                  <span>{pointSystemLabels.wins}</span>
                </label>
              </div>

              {/* Point Config */}
              {formData.point_system === 'ranking' ? (
                <div className="space-y-2">
                  <Label>{t('rankingPoints')}</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(formData.point_config as RankingPointConfig).map(([rank, points]) => (
                      <div key={rank} className="flex items-center gap-2">
                        <span className="w-16">{rank}{t('rankLabel')}</span>
                        <Input
                          type="number"
                          value={points}
                          onChange={(e) => {
                            const newConfig = { ...(formData.point_config as RankingPointConfig) }
                            newConfig[rank] = parseInt(e.target.value) || 0
                            updateFormData('point_config', newConfig)
                          }}
                          className="w-20 h-8"
                        />
                        <span>{tDetail('points')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('winPoints')}</Label>
                  <div className="flex items-center gap-2">
                    <span>{t('perWinLabel')}</span>
                    <Input
                      type="number"
                      value={(formData.point_config as WinsPointConfig).points_per_win}
                      onChange={(e) => {
                        updateFormData('point_config', {
                          ...formData.point_config,
                          points_per_win: parseInt(e.target.value) || 0,
                        })
                      }}
                      className="w-20 h-8"
                    />
                    <span>{tDetail('points')}</span>
                  </div>
                </div>
              )}

              {/* Point Calculation Mode */}
              <div className="space-y-2 pt-4 border-t">
                <Label>{t('calculationModeLabel')}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="point_calculation_mode"
                      value="auto"
                      checked={formData.point_calculation_mode === 'auto'}
                      onChange={() => updateFormData('point_calculation_mode', 'auto')}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium">{pointCalculationModeLabels.auto}</span>
                      <p className="text-xs text-muted-foreground">{t('calculationModeAutoDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="point_calculation_mode"
                      value="manual"
                      checked={formData.point_calculation_mode === 'manual'}
                      onChange={() => updateFormData('point_calculation_mode', 'manual')}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium">{pointCalculationModeLabels.manual}</span>
                      <p className="text-xs text-muted-foreground">{t('calculationModeManualDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('periodLabel')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{tDetail('startDate')}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => updateFormData('start_date', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">{tDetail('endDate')}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => updateFormData('end_date', e.target.value || null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
