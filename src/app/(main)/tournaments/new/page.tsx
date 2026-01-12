'use client'

import { useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TournamentFormat,
  MatchFormat,
  Visibility,
} from '@/types/database'

type InputType = 'text' | 'checkbox' | 'image'
type EditDeadline = 'entry_closed' | 'entry_period' | 'bracket_published' | 'event_end'

type CustomField = {
  key: string
  label: string
  inputType: InputType
  required: boolean
  hidden: boolean
  editDeadline: EditDeadline
  placeholder: string
  options?: string[] // For checkbox type
}

type Section = 'overview' | 'participants' | 'tournament' | 'schedule'

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: '概要', icon: '📋' },
  { id: 'participants', label: '参加者設定', icon: '👥' },
  { id: 'tournament', label: 'トーナメント設定', icon: '🏆' },
  { id: 'schedule', label: '日程', icon: '📅' },
]

export default function NewTournamentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tournament_format: 'single_elimination' as TournamentFormat,
    match_format: 'bo3' as MatchFormat,
    max_participants: 32,
    visibility: 'public' as Visibility,
    entry_start_at: '',
    entry_deadline: '',
    start_at: '',
  })

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        key: `field_${Date.now()}`,
        label: '',
        inputType: 'text',
        required: false,
        hidden: false,
        editDeadline: 'bracket_published',
        placeholder: '',
        options: [],
      },
    ])
  }

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...field }
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

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('画像サイズは3MB以下にしてください')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>, asDraft = false) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('ログインが必要です')
        return
      }

      if (!formData.title.trim()) {
        setError('大会名を入力してください')
        setActiveSection('overview')
        return
      }

      const validCustomFields = customFields.filter((f) => f.label.trim() !== '')

      const tournamentData = {
        title: formData.title,
        description: formData.description,
        tournament_format: formData.tournament_format,
        match_format: formData.match_format,
        max_participants: formData.max_participants,
        visibility: formData.visibility,
        entry_start_at: formData.entry_start_at
          ? new Date(formData.entry_start_at).toISOString()
          : null,
        entry_deadline: formData.entry_deadline
          ? new Date(formData.entry_deadline).toISOString()
          : null,
        start_at: formData.start_at
          ? new Date(formData.start_at).toISOString()
          : null,
        organizer_id: user.id,
        status: asDraft ? 'draft' as const : 'recruiting' as const,
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

  const scrollToSection = (sectionId: Section) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`section-${sectionId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              ← 戻る
            </Button>
            <h1 className="text-lg font-semibold">大会を新規作成</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={loading}
            >
              下書き保存
            </Button>
            <Button
              onClick={(e) => handleSubmit(e as any, false)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? '作成中...' : '大会を作成'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 shrink-0">
            <nav className="sticky top-20 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2
                    transition-colors
                    ${activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
              {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Overview Section */}
              <section id="section-overview" className="bg-background rounded-lg border p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>📋</span> 概要
                </h2>

                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">カバー画像</label>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF形式、3MB以下、16:9推奨
                  </p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative aspect-video rounded-lg border-2 border-dashed
                      cursor-pointer overflow-hidden
                      flex items-center justify-center
                      transition-colors hover:border-primary
                      ${coverPreview ? 'border-solid' : 'bg-muted/50'}
                    `}
                  >
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-sm">画像を変更</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleCoverImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Event Name */}
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    大会名 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="例: 第1回 新春トーナメント"
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    説明
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="大会の説明やルールを入力..."
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md resize-y"
                    disabled={loading}
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">公開設定</label>
                  <div className="space-y-2">
                    {[
                      { value: 'public', label: '公開', desc: '誰でも閲覧・参加可能' },
                      { value: 'unlisted', label: '限定公開', desc: 'URLを知っている人のみ' },
                      { value: 'private', label: '非公開', desc: '主催者のみ閲覧可能' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-md border cursor-pointer
                          transition-colors
                          ${formData.visibility === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={option.value}
                          checked={formData.visibility === option.value}
                          onChange={(e) => updateFormData('visibility', e.target.value)}
                          className="mt-1"
                          disabled={loading}
                        />
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* Participants Section */}
              <section id="section-participants" className="bg-background rounded-lg border p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>👥</span> 参加者設定
                </h2>

                {/* Max Participants */}
                <div className="space-y-2">
                  <label htmlFor="max_participants" className="text-sm font-medium">
                    最大参加者数
                  </label>
                  <Input
                    id="max_participants"
                    type="number"
                    min="4"
                    max="128"
                    value={formData.max_participants}
                    onChange={(e) => updateFormData('max_participants', parseInt(e.target.value))}
                    disabled={loading}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">4〜128人</p>
                </div>

                {/* Custom Entry Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">エントリー時の入力項目</label>
                      <p className="text-xs text-muted-foreground">
                        参加者にエントリー時に入力してもらう項目
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
                    <div className="space-y-4">
                      {customFields.map((field, index) => (
                        <div
                          key={field.key}
                          className="border rounded-lg overflow-hidden bg-background"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateCustomField(index, { label: e.target.value })
                              }
                              placeholder="項目名を入力"
                              disabled={loading}
                              className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFields = [...customFields]
                                  newFields.splice(index + 1, 0, { ...field, key: `field_${Date.now()}` })
                                  setCustomFields(newFields)
                                }}
                                disabled={loading}
                                className="h-8 w-8 p-0 text-muted-foreground"
                                title="コピー"
                              >
                                📋
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomField(index)}
                                disabled={loading}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="削除"
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Input Type */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                入力方式
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { value: 'text', label: '記述式', icon: '≡' },
                                  { value: 'checkbox', label: 'チェックボックス', icon: '✓' },
                                  { value: 'image', label: '画像アップロード', icon: '🖼️' },
                                ].map((option) => (
                                  <label
                                    key={option.value}
                                    className={`
                                      flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm
                                      transition-colors
                                      ${field.inputType === option.value
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'hover:bg-muted/50'
                                      }
                                    `}
                                  >
                                    <input
                                      type="radio"
                                      name={`inputType-${index}`}
                                      value={option.value}
                                      checked={field.inputType === option.value}
                                      onChange={(e) =>
                                        updateCustomField(index, { inputType: e.target.value as InputType })
                                      }
                                      disabled={loading}
                                      className="sr-only"
                                    />
                                    <span>{option.icon}</span>
                                    {option.label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Placeholder (only for text type) */}
                            {field.inputType === 'text' && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                  プレースホルダー
                                </label>
                                <Input
                                  value={field.placeholder}
                                  onChange={(e) =>
                                    updateCustomField(index, { placeholder: e.target.value })
                                  }
                                  placeholder="例: 123-456-789"
                                  disabled={loading}
                                />
                              </div>
                            )}

                            {/* Checkbox options */}
                            {field.inputType === 'checkbox' && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  選択肢（改行で区切る）
                                </label>
                                <textarea
                                  value={field.options?.join('\n') || ''}
                                  onChange={(e) =>
                                    updateCustomField(index, {
                                      options: e.target.value.split('\n').filter(Boolean),
                                    })
                                  }
                                  placeholder="選択肢1&#10;選択肢2&#10;選択肢3"
                                  disabled={loading}
                                  className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y"
                                />
                              </div>
                            )}

                            {/* Advanced Settings */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                詳細設定
                              </label>
                              <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!field.required}
                                    onChange={(e) =>
                                      updateCustomField(index, { required: !e.target.checked })
                                    }
                                    disabled={loading}
                                    className="rounded"
                                  />
                                  任意回答
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.hidden}
                                    onChange={(e) =>
                                      updateCustomField(index, { hidden: e.target.checked })
                                    }
                                    disabled={loading}
                                    className="rounded"
                                  />
                                  回答を非公開
                                </label>
                              </div>
                            </div>

                            {/* Edit Deadline */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                変更期限
                              </label>
                              <p className="text-xs text-muted-foreground">
                                参加者が回答を変更できる期限です
                              </p>
                              <div className="space-y-1">
                                {[
                                  { value: 'entry_closed', label: 'エントリー後変更不可' },
                                  { value: 'entry_period', label: 'エントリー期間終了まで' },
                                  { value: 'bracket_published', label: 'トーナメント表公開まで' },
                                  { value: 'event_end', label: 'イベント終了まで' },
                                ].map((option) => (
                                  <label
                                    key={option.value}
                                    className="flex items-center gap-2 text-sm cursor-pointer py-1"
                                  >
                                    <input
                                      type="radio"
                                      name={`editDeadline-${index}`}
                                      value={option.value}
                                      checked={field.editDeadline === option.value}
                                      onChange={(e) =>
                                        updateCustomField(index, { editDeadline: e.target.value as EditDeadline })
                                      }
                                      disabled={loading}
                                      className="text-primary"
                                    />
                                    {option.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Tournament Section */}
              <section id="section-tournament" className="bg-background rounded-lg border p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>🏆</span> トーナメント設定
                </h2>

                {/* Tournament Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">トーナメント形式</label>
                  <div className="space-y-2">
                    {[
                      { value: 'single_elimination', label: 'シングルエリミネーション', desc: '負けたら終わり', enabled: true },
                      { value: 'double_elimination', label: 'ダブルエリミネーション', desc: '2回負けたら終わり（Phase 2予定）', enabled: false },
                      { value: 'swiss', label: 'スイスドロー', desc: '勝敗に関係なく対戦（Phase 2予定）', enabled: false },
                      { value: 'round_robin', label: '総当たり', desc: '全員と対戦（Phase 2予定）', enabled: false },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-md border cursor-pointer
                          transition-colors
                          ${!option.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                          ${formData.tournament_format === option.value && option.enabled
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="tournament_format"
                          value={option.value}
                          checked={formData.tournament_format === option.value}
                          onChange={(e) => updateFormData('tournament_format', e.target.value)}
                          disabled={loading || !option.enabled}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Match Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">対戦形式</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'bo1', label: '1本勝負' },
                      { value: 'bo3', label: '2本先取' },
                      { value: 'bo5', label: '3本先取' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          px-4 py-2 rounded-md border cursor-pointer text-sm
                          transition-colors
                          ${formData.match_format === option.value
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="match_format"
                          value={option.value}
                          checked={formData.match_format === option.value}
                          onChange={(e) => updateFormData('match_format', e.target.value)}
                          disabled={loading}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* Schedule Section */}
              <section id="section-schedule" className="bg-background rounded-lg border p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>📅</span> 日程
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="start_at" className="text-sm font-medium">
                      開催日時
                    </label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => updateFormData('start_at', e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="entry_start_at" className="text-sm font-medium">
                      エントリー開始
                    </label>
                    <Input
                      id="entry_start_at"
                      type="datetime-local"
                      value={formData.entry_start_at}
                      onChange={(e) => updateFormData('entry_start_at', e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="entry_deadline" className="text-sm font-medium">
                      エントリー締切
                    </label>
                    <Input
                      id="entry_deadline"
                      type="datetime-local"
                      value={formData.entry_deadline}
                      onChange={(e) => updateFormData('entry_deadline', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </section>

              {/* Submit Buttons (Mobile) */}
              <div className="flex gap-2 sm:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleSubmit(e as any, true)}
                  disabled={loading}
                  className="flex-1"
                >
                  下書き保存
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? '作成中...' : '大会を作成'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
