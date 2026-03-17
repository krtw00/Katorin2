'use client'

import { useState, FormEvent, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Enums,
  Tables,
} from '@/types/database'
import { Tournament, CustomField, InputType, EditDeadline } from '@/types/round'
import { parseCustomFields } from '@/lib/types/guards'
import { useTranslations } from 'next-intl'

type League = Tables<'leagues'>
type TournamentFormat = Enums<'tournament_format'>
type MatchFormat = Enums<'match_format'>
type Visibility = Enums<'visibility'>
type EntryMode = Enums<'entry_mode'>

type Section = 'overview' | 'participants' | 'tournament' | 'schedule'

type TournamentFormProps = {
  mode: 'create' | 'edit'
  initialData?: Tournament
  defaultLeagueId?: string
  onSuccess?: (tournament: Tournament) => void
}

export function TournamentForm({ mode, initialData, defaultLeagueId, onSuccess }: TournamentFormProps) {
  const t = useTranslations('tournament.form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('overview')

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: 'overview', label: t('sections.overview'), icon: '📋' },
    { id: 'participants', label: t('sections.participants'), icon: '👥' },
    { id: 'tournament', label: t('sections.tournament'), icon: '🏆' },
    { id: 'schedule', label: t('sections.schedule'), icon: '📅' },
  ]
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    try {
      return parseCustomFields(initialData?.custom_fields)
    } catch {
      return []
    }
  })
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(initialData?.discord_webhook_url || '')
  const [webhookError, setWebhookError] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialData?.cover_image_url || null
  )
  const [leagues, setLeagues] = useState<League[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Helper to format date for datetime-local input
  const formatDateTimeLocal = (date: Date | string | null) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // Form state with initial data or defaults
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        title: initialData.title,
        description: initialData.description || '',
        entry_type: initialData.entry_type || 'individual' as 'individual' | 'team',
        tournament_format: initialData.format,
        match_format: initialData.match_format,
        max_participants: initialData.max_participants,
        entry_limit_behavior: initialData.entry_limit_behavior,
        entry_mode: initialData.entry_mode || 'open' as EntryMode,
        visibility: initialData.visibility,
        league_id: initialData.league_id || '',
        entry_start_at: formatDateTimeLocal(initialData.entry_start_at),
        entry_deadline: formatDateTimeLocal(initialData.entry_deadline),
        start_at: formatDateTimeLocal(initialData.start_at),
        order_size: initialData.order_size || 3,
        sub_count: initialData.sub_count || 1,
        players_per_round: initialData.players_per_round || 3,
        rounds_to_win: initialData.rounds_to_win || 2,
        win_point_value: initialData.win_point_value || 3,
      }
    }
    const now = new Date()
    return {
      title: '',
      description: '',
      entry_type: 'individual' as 'individual' | 'team',
      tournament_format: 'single_elimination' as TournamentFormat,
      match_format: 'bo3' as MatchFormat,
      max_participants: 32,
      entry_limit_behavior: 'first_come' as 'first_come' | 'waitlist',
      entry_mode: 'open' as EntryMode,
      visibility: 'public' as Visibility,
      league_id: defaultLeagueId || '',
      entry_start_at: formatDateTimeLocal(now),
      entry_deadline: '',
      start_at: formatDateTimeLocal(now),
      order_size: 3,
      sub_count: 1,
      players_per_round: 3,
      rounds_to_win: 2,
      win_point_value: 3,
    }
  })

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Fetch user's leagues
  useEffect(() => {
    const fetchSeries = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('leagues')
        .select('*')
        .eq('organizer_id', user.id)
        .in('status', ['draft', 'in_progress'])
        .order('created_at', { ascending: false })

      if (data) {
        setLeagues(data)
      }
    }

    fetchSeries()
  }, [supabase])

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
        setError(t('errors.imageSize'))
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement> | React.MouseEvent, asDraft = false) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError(t('errors.loginRequired'))
        return
      }

      if (!formData.title.trim()) {
        setError(t('errors.titleRequired'))
        setActiveSection('overview')
        return
      }

      // Webhook URL validation
      const trimmedWebhookUrl = discordWebhookUrl.trim()
      if (trimmedWebhookUrl && !trimmedWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        setWebhookError(t('webhookInvalid'))
        setLoading(false)
        return
      }
      setWebhookError('')

      const validCustomFields = customFields.filter((f) => f.label.trim() !== '')

      const tournamentData = {
        title: formData.title,
        description: formData.description,
        format: formData.tournament_format,
        match_format: formData.match_format,
        max_participants: formData.max_participants,
        entry_limit_behavior: formData.entry_limit_behavior,
        entry_mode: formData.entry_mode,
        visibility: defaultLeagueId ? 'public' as Visibility : formData.visibility,
        league_id: formData.league_id || null,
        entry_start_at: formData.entry_start_at
          ? new Date(formData.entry_start_at).toISOString()
          : null,
        entry_deadline: formData.entry_deadline
          ? new Date(formData.entry_deadline).toISOString()
          : null,
        start_at: formData.start_at
          ? new Date(formData.start_at).toISOString()
          : null,
        custom_fields: validCustomFields,
        entry_type: formData.entry_type,
        discord_webhook_url: trimmedWebhookUrl || null,
        ...(formData.entry_type === 'team' ? {
          order_size: formData.order_size,
          sub_count: formData.sub_count,
          players_per_round: formData.players_per_round,
          rounds_to_win: formData.rounds_to_win,
          win_point_value: formData.win_point_value,
        } : {}),
      }

      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('rounds')
          .insert({
            ...tournamentData,
            organizer_id: user.id,
            status: asDraft ? 'draft' as const : 'recruiting' as const,
          })
          .select()
          .single()

        if (insertError) {
          setError(insertError.message)
          return
        }

        // シリーズ紐付き時: 既存チームのエントリーを自動作成
        if (defaultLeagueId && data.id) {
          const { data: seriesTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('league_id', defaultLeagueId)
          if (seriesTeams?.length) {
            const entries = seriesTeams.map(t => ({
              round_id: data.id,
              team_id: t.id,
            }))
            await supabase
              .from('team_entries')
              .upsert(entries, { onConflict: 'round_id,team_id' })
          }
        }

        if (onSuccess) {
          onSuccess(data)
        } else {
          router.push(`/tournaments/${data.id}`)
        }
      } else {
        // Edit mode
        const { data, error: updateError } = await supabase
          .from('rounds')
          .update(tournamentData)
          .eq('id', initialData!.id)
          .select()
          .single()

        if (updateError) {
          setError(updateError.message)
          return
        }

        if (onSuccess) {
          onSuccess(data)
        } else {
          router.push(`/tournaments/${data.id}`)
        }
      }
    } catch {
      setError(mode === 'create' ? t('errors.createFailed') : t('errors.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const scrollToSection = (sectionId: Section) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`section-${sectionId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isEditMode = mode === 'edit'
  const headerTitle = isEditMode ? t('editTitle') : t('createTitle')
  const submitButtonText = isEditMode
    ? loading ? t('saving') : t('saveChanges')
    : loading ? t('creating') : t('createButton')

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
              {t('back')}
            </Button>
            <h1 className="text-lg font-semibold">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
              >
                {t('saveDraft')}
              </Button>
            )}
            <Button
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitButtonText}
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
                  <span>📋</span> {t('sections.overview')}
                </h2>

                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('coverImage.label')}</label>
                  <p className="text-xs text-muted-foreground">
                    {t('coverImage.hint')}
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-sm">{t('coverImage.change')}</p>
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
                    {t('title.label')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder={t('title.placeholder')}
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    {t('description.label')}
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder={t('description.placeholder')}
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md resize-y"
                    disabled={loading}
                  />
                </div>

                {/* Series info (シリーズからの追加時は固定表示、単発大会では非表示) */}
                {defaultLeagueId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('leagues.label')}</label>
                    <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                      {leagues.find(s => s.id === defaultLeagueId)?.title || 'シリーズに紐づけ済み'}
                    </div>
                  </div>
                )}

                {/* Visibility（シリーズ紐付き時は非表示、シリーズの設定に従う） */}
                {!defaultLeagueId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('visibility.label')}</label>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: t('visibility.public'), desc: t('visibility.publicDesc') },
                        { value: 'unlisted', label: t('visibility.unlisted'), desc: t('visibility.unlistedDesc') },
                        { value: 'private', label: t('visibility.private'), desc: t('visibility.privateDesc') },
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
                )}
              </section>

              {/* Participants Section */}
              <section id="section-participants" className="bg-background rounded-lg border p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>👥</span> {t('sections.participants')}
                </h2>

                {/* Max Participants */}
                <div className="space-y-2">
                  <label htmlFor="max_participants" className="text-sm font-medium">
                    {t('maxParticipants.label')}
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
                  <p className="text-xs text-muted-foreground">{t('maxParticipants.hint')}</p>
                </div>

                {/* Entry Limit Behavior */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('entryLimitBehavior.label')}</label>
                  <div className="space-y-2">
                    {[
                      { value: 'first_come', label: t('entryLimitBehavior.firstCome'), desc: t('entryLimitBehavior.firstComeDesc') },
                      { value: 'waitlist', label: t('entryLimitBehavior.waitlist'), desc: t('entryLimitBehavior.waitlistDesc') },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-md border cursor-pointer
                          transition-colors
                          ${formData.entry_limit_behavior === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="entry_limit_behavior"
                          value={option.value}
                          checked={formData.entry_limit_behavior === option.value}
                          onChange={(e) => updateFormData('entry_limit_behavior', e.target.value)}
                          disabled={loading}
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

                {/* Entry Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('entryMode.label')}</label>
                  <div className="space-y-2">
                    {[
                      { value: 'open', label: t('entryMode.open'), desc: t('entryMode.openDesc') },
                      { value: 'invite_only', label: t('entryMode.inviteOnly'), desc: t('entryMode.inviteOnlyDesc') },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-md border cursor-pointer
                          transition-colors
                          ${formData.entry_mode === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="entry_mode"
                          value={option.value}
                          checked={formData.entry_mode === option.value}
                          onChange={(e) => updateFormData('entry_mode', e.target.value)}
                          disabled={loading}
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

                {/* Custom Entry Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">{t('customFields.label')}</label>
                      <p className="text-xs text-muted-foreground">
                        {t('customFields.hint')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomField}
                      disabled={loading}
                    >
                      {t('customFields.add')}
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
                              placeholder={t('customFields.namePlaceholder')}
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
                                title={t('customFields.copy')}
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
                                title={t('customFields.delete')}
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Input Type */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                {t('customFields.inputType.label')}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { value: 'text', label: t('customFields.inputType.text'), icon: '≡' },
                                  { value: 'checkbox', label: t('customFields.inputType.checkbox'), icon: '✓' },
                                  { value: 'image', label: t('customFields.inputType.image'), icon: '🖼️' },
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
                                  {t('customFields.placeholder.label')}
                                </label>
                                <Input
                                  value={field.placeholder}
                                  onChange={(e) =>
                                    updateCustomField(index, { placeholder: e.target.value })
                                  }
                                  placeholder={t('customFields.placeholder.hint')}
                                  disabled={loading}
                                />
                              </div>
                            )}

                            {/* Checkbox options */}
                            {field.inputType === 'checkbox' && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  {t('customFields.options.label')}
                                </label>
                                <textarea
                                  value={field.options?.join('\n') || ''}
                                  onChange={(e) =>
                                    updateCustomField(index, {
                                      options: e.target.value.split('\n').filter(Boolean),
                                    })
                                  }
                                  placeholder={t('customFields.options.placeholder')}
                                  disabled={loading}
                                  className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y"
                                />
                              </div>
                            )}

                            {/* Advanced Settings */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                {t('customFields.advanced.label')}
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
                                  {t('customFields.advanced.optional')}
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
                                  {t('customFields.advanced.hidden')}
                                </label>
                              </div>
                            </div>

                            {/* Edit Deadline */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                {t('customFields.editDeadline.label')}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {t('customFields.editDeadline.hint')}
                              </p>
                              <div className="space-y-1">
                                {[
                                  { value: 'entry_closed', label: t('customFields.editDeadline.entryClosed') },
                                  { value: 'entry_period', label: t('customFields.editDeadline.entryPeriod') },
                                  { value: 'bracket_published', label: t('customFields.editDeadline.bracketPublished') },
                                  { value: 'event_end', label: t('customFields.editDeadline.eventEnd') },
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
                  <span>🏆</span> {t('sections.tournament')}
                </h2>

                {/* Entry Type (Individual / Team) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">参加形式</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'individual', label: '個人戦' },
                      { value: 'team', label: 'チーム戦' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          px-4 py-2 rounded-md border cursor-pointer text-sm transition-colors
                          ${formData.entry_type === option.value
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="entry_type"
                          value={option.value}
                          checked={formData.entry_type === option.value}
                          onChange={(e) => updateFormData('entry_type', e.target.value)}
                          disabled={loading}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* チーム戦: チーム人数上限のみ（詳細ルールはシリーズ側で管理） */}
                {formData.entry_type === 'team' && !defaultLeagueId && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <label className="text-sm font-medium">チーム人数上限</label>
                    <p className="text-xs text-muted-foreground">1チームあたりの最大メンバー数</p>
                    <Input
                      type="number" min="2" max="20"
                      value={formData.order_size + formData.sub_count}
                      onChange={(e) => {
                        const total = parseInt(e.target.value) || 5
                        updateFormData('order_size', total)
                        updateFormData('sub_count', 0)
                      }}
                      disabled={loading} className="w-24"
                    />
                  </div>
                )}

                {/* Tournament Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('tournamentFormat.label')}</label>
                  <div className="space-y-2">
                    {[
                      { value: 'single_elimination', label: t('tournamentFormat.singleElimination'), desc: t('tournamentFormat.singleEliminationDesc'), enabled: true },
                      { value: 'double_elimination', label: t('tournamentFormat.doubleElimination'), desc: t('tournamentFormat.doubleEliminationDesc'), enabled: true },
                      { value: 'swiss', label: t('tournamentFormat.swiss'), desc: t('tournamentFormat.swissDesc'), enabled: true },
                      { value: 'round_robin', label: t('tournamentFormat.roundRobin'), desc: t('tournamentFormat.roundRobinDesc'), enabled: true },
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
                  <label className="text-sm font-medium">{t('matchFormat.label')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'bo1', label: t('matchFormat.bo1') },
                      { value: 'bo3', label: t('matchFormat.bo3') },
                      { value: 'bo5', label: t('matchFormat.bo5') },
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
                  <span>📅</span> {t('sections.schedule')}
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('entryPeriod.label')}</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        id="entry_start_at"
                        type="datetime-local"
                        value={formData.entry_start_at}
                        onChange={(e) => updateFormData('entry_start_at', e.target.value)}
                        disabled={loading}
                        className="w-auto"
                      />
                      <span className="text-muted-foreground">〜</span>
                      <Input
                        id="entry_deadline"
                        type="datetime-local"
                        value={formData.entry_deadline}
                        onChange={(e) => updateFormData('entry_deadline', e.target.value)}
                        disabled={loading}
                        className="w-auto"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('entryPeriod.hint')}
                    </p>
                  </div>
                </div>
              </section>

              {/* Discord Webhook */}
              <section className="bg-background rounded-lg border p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Discord {t('webhookLabel')}
                </h2>
                <div className="space-y-2">
                  <Input
                    id="discord_webhook_url"
                    value={discordWebhookUrl}
                    onChange={(e) => {
                      setDiscordWebhookUrl(e.target.value)
                      setWebhookError('')
                    }}
                    placeholder="https://discord.com/api/webhooks/..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('webhookHint')}
                  </p>
                  {webhookError && (
                    <p className="text-xs text-destructive">{webhookError}</p>
                  )}
                </div>
              </section>

              {/* Submit Buttons (Mobile) */}
              <div className="flex gap-2 sm:hidden">
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading}
                    className="flex-1"
                  >
                    {t('saveDraft')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitButtonText}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
