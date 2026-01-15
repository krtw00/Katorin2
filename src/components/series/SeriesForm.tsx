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
  pointSystemLabels,
  defaultRankingPoints,
  defaultWinsPointConfig,
  RankingPointConfig,
  WinsPointConfig,
} from '@/types/series'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: () => void
}

export function SeriesForm({ mode, initialData, onSuccess }: Props) {
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
      start_date: null,
      end_date: null,
    }
  })

  const updateFormData = (field: keyof SeriesFormData, value: any) => {
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
        setError('ログインが必要です')
        return
      }

      // Validation
      if (!formData.name.trim()) {
        setError('シリーズ名を入力してください')
        return
      }

      const seriesData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        entry_type: formData.entry_type,
        point_system: formData.point_system,
        point_config: formData.point_config,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: asDraft ? 'draft' : 'active',
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
    } catch (err: any) {
      setError(err.message || '保存に失敗しました')
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
              ← 戻る
            </Button>
            <h1 className="text-lg font-bold">
              {mode === 'create' ? 'シリーズを作成' : 'シリーズを編集'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
            >
              下書き保存
            </Button>
            <Button
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
            >
              {loading ? '保存中...' : mode === 'edit' ? '変更を保存' : 'シリーズを作成'}
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
              <CardTitle className="text-lg">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">シリーズ名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="例: 2025年シーズンリーグ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="シリーズの説明を入力..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Entry Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">参加形式</CardTitle>
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
                  <span>個人戦</span>
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
                  <span>チーム戦</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Point System */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ポイントシステム</CardTitle>
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
                  <Label>順位別ポイント</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(formData.point_config as RankingPointConfig).map(([rank, points]) => (
                      <div key={rank} className="flex items-center gap-2">
                        <span className="w-16">{rank}位:</span>
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
                        <span>pt</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>勝利ポイント</Label>
                  <div className="flex items-center gap-2">
                    <span>1勝につき:</span>
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
                    <span>pt</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">開催期間</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">開始日</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => updateFormData('start_date', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">終了日</Label>
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
