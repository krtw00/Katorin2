'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TournamentFormat,
  MatchFormat,
  Visibility,
} from '@/types/database'

type CustomField = {
  key: string
  label: string
  required: boolean
  placeholder: string
}

export default function NewTournamentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const router = useRouter()
  const supabase = createClient()

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { key: `field_${Date.now()}`, label: '', required: false, placeholder: '' },
    ])
  }

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...field }
    // keyをlabelから自動生成（英数字とアンダースコアのみ）
    if (field.label !== undefined) {
      updated[index].key = field.label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || `field_${index}`
    }
    setCustomFields(updated)
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('ログインが必要です')
        return
      }

      // Filter out custom fields with empty labels
      const validCustomFields = customFields.filter((f) => f.label.trim() !== '')

      const tournamentData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        tournament_format: formData.get('tournament_format') as TournamentFormat,
        match_format: formData.get('match_format') as MatchFormat,
        max_participants: parseInt(formData.get('max_participants') as string),
        visibility: formData.get('visibility') as Visibility,
        entry_start_at: formData.get('entry_start_at')
          ? new Date(formData.get('entry_start_at') as string).toISOString()
          : null,
        entry_deadline: formData.get('entry_deadline')
          ? new Date(formData.get('entry_deadline') as string).toISOString()
          : null,
        start_at: formData.get('start_at')
          ? new Date(formData.get('start_at') as string).toISOString()
          : null,
        organizer_id: user.id,
        status: 'draft' as const,
        custom_fields: validCustomFields,
      }

      const { data, error: insertError } = await supabase
        .from('tournaments')
        .insert(tournamentData)
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push(`/tournaments/${data.id}`)
    } catch (err) {
      setError('大会の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">大会を作成</CardTitle>
          <CardDescription>
            新しいトーナメントの情報を入力してください
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">基本情報</h3>

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  大会名 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder="例: 第1回 新春トーナメント"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  説明
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="大会の説明や注意事項を入力..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="visibility" className="text-sm font-medium">
                  公開設定 <span className="text-destructive">*</span>
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={loading}
                  defaultValue="public"
                >
                  <option value="public">公開</option>
                  <option value="unlisted">限定公開</option>
                  <option value="private">非公開</option>
                </select>
              </div>
            </div>

            {/* Tournament Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold">トーナメント設定</h3>

              <div className="space-y-2">
                <label
                  htmlFor="tournament_format"
                  className="text-sm font-medium"
                >
                  トーナメント形式 <span className="text-destructive">*</span>
                </label>
                <select
                  id="tournament_format"
                  name="tournament_format"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={loading}
                  defaultValue="single_elimination"
                >
                  <option value="single_elimination">
                    シングルエリミネーション
                  </option>
                  <option value="double_elimination" disabled>
                    ダブルエリミネーション（Phase 2で実装予定）
                  </option>
                  <option value="swiss" disabled>
                    スイスドロー（Phase 2で実装予定）
                  </option>
                  <option value="round_robin" disabled>
                    総当たり（Phase 2で実装予定）
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="match_format" className="text-sm font-medium">
                  対戦形式 <span className="text-destructive">*</span>
                </label>
                <select
                  id="match_format"
                  name="match_format"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={loading}
                  defaultValue="bo3"
                >
                  <option value="bo1">1本勝負</option>
                  <option value="bo3">マッチ戦（2本先取）</option>
                  <option value="bo5">マッチ戦（3本先取）</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="max_participants"
                  className="text-sm font-medium"
                >
                  最大参加者数 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min="4"
                  max="128"
                  defaultValue="32"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  4〜128人で設定してください
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="font-semibold">日程</h3>

              <div className="space-y-2">
                <label htmlFor="entry_start_at" className="text-sm font-medium">
                  エントリー開始日時
                </label>
                <Input
                  id="entry_start_at"
                  name="entry_start_at"
                  type="datetime-local"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="entry_deadline" className="text-sm font-medium">
                  エントリー締切日時
                </label>
                <Input
                  id="entry_deadline"
                  name="entry_deadline"
                  type="datetime-local"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="start_at" className="text-sm font-medium">
                  開催日時
                </label>
                <Input
                  id="start_at"
                  name="start_at"
                  type="datetime-local"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Custom Entry Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">エントリー時の入力項目</h3>
                  <p className="text-xs text-muted-foreground">
                    参加者にエントリー時に入力してもらう項目を設定できます
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  disabled={loading}
                >
                  + 項目を追加
                </Button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div
                      key={field.key}
                      className="border rounded-md p-3 space-y-3 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          項目 {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                          disabled={loading}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            項目名
                          </label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateCustomField(index, { label: e.target.value })
                            }
                            placeholder="例: マスターデュエルID"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            プレースホルダー
                          </label>
                          <Input
                            value={field.placeholder}
                            onChange={(e) =>
                              updateCustomField(index, {
                                placeholder: e.target.value,
                              })
                            }
                            placeholder="例: 123-456-789"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateCustomField(index, {
                              required: e.target.checked,
                            })
                          }
                          disabled={loading}
                          className="rounded"
                        />
                        必須項目にする
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? '作成中...' : '大会を作成'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
