'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
import { Tournament, CustomField } from '@/types/tournament'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { uploadEntryImage, isUploadError } from '@/lib/supabase/storage'

// Pending image upload tracking
type PendingImage = {
  file: File
  previewUrl: string
}

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentEntryPage({ params }: Props) {
  const t = useTranslations('tournament.entry')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [customData, setCustomData] = useState<Record<string, string>>({})
  const [pendingImages, setPendingImages] = useState<Record<string, PendingImage>>({})
  const [uploadingImages, setUploadingImages] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadTournament = async () => {
      const { id } = await params
      const { data, error } = (await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()) as { data: Tournament | null; error: unknown }

      if (error || !data) {
        setError(t('errors.notFound'))
      } else {
        setTournament(data)
        // Parse custom_fields from tournament
        const fields = (data.custom_fields as CustomField[]) || []
        setCustomFields(fields)
        // Initialize custom data with empty values
        const initialData: Record<string, string> = {}
        fields.forEach((f) => {
          initialData[f.key] = ''
        })
        setCustomData(initialData)
      }
      setLoading(false)
    }

    loadTournament()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // 大会ごとに表示名を入力させるため、プロファイルの名前はデフォルトにしない
  // useEffect(() => {
  //   if (profile?.display_name) {
  //     setDisplayName(profile.display_name)
  //   }
  // }, [profile])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (!user || !tournament) {
        setError('ログインが必要です')
        return
      }

      if (!displayName.trim()) {
        setError(t('errors.displayNameRequired'))
        return
      }

      // Validate required custom fields
      for (const field of customFields) {
        if (field.required && !customData[field.key]?.trim()) {
          setError(`${field.label}を入力してください`)
          return
        }
      }

      // Check if already entered
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        setError(t('errors.alreadyEntered'))
        return
      }

      // Check if tournament is full
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)

      if (count && count >= tournament.max_participants) {
        setError('定員に達しています')
        return
      }

      // Upload pending images
      const finalCustomData = { ...customData }
      const pendingImageEntries = Object.entries(pendingImages)

      if (pendingImageEntries.length > 0) {
        setUploadingImages(true)
        for (const [fieldKey, pendingImage] of pendingImageEntries) {
          const result = await uploadEntryImage(
            supabase,
            pendingImage.file,
            user.id,
            tournament.id
          )

          if (isUploadError(result)) {
            setError(`画像のアップロードに失敗しました: ${result.message}`)
            setUploadingImages(false)
            return
          }

          // Store the uploaded URL
          finalCustomData[fieldKey] = result.url
        }
        setUploadingImages(false)
      }

      // Create entry
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          display_name: displayName.trim(),
          custom_data: finalCustomData,
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push(`/tournaments/${tournament.id}`)
    } catch {
      setError(t('errors.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t('loginRequired')}</CardTitle>
            <CardDescription>
              トーナメントにエントリーするにはログインしてください
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">ログイン</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{tournament.title}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="display_name" className="text-sm font-medium">
                表示名 <span className="text-destructive">*</span>
              </label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('displayNamePlaceholder')}
                disabled={submitting}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                この大会で使用する表示名を入力してください
              </p>
            </div>

            {customFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>

                {/* Text input */}
                {(!field.inputType || field.inputType === 'text') && (
                  <Input
                    id={field.key}
                    value={customData[field.key] || ''}
                    onChange={(e) =>
                      setCustomData({ ...customData, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    disabled={submitting}
                  />
                )}

                {/* Checkbox input */}
                {field.inputType === 'checkbox' && field.options && (
                  <div className="space-y-2">
                    {field.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(customData[field.key] || '').split(',').includes(option)}
                          onChange={(e) => {
                            const current = (customData[field.key] || '').split(',').filter(Boolean)
                            const updated = e.target.checked
                              ? [...current, option]
                              : current.filter((v) => v !== option)
                            setCustomData({ ...customData, [field.key]: updated.join(',') })
                          }}
                          disabled={submitting}
                          className="rounded"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}

                {/* Image upload */}
                {field.inputType === 'image' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // Validate file size (3MB max)
                          if (file.size > 3 * 1024 * 1024) {
                            setError('画像サイズは3MB以下にしてください')
                            return
                          }
                          // Create preview URL
                          const previewUrl = URL.createObjectURL(file)
                          // Store file for later upload
                          setPendingImages(prev => ({
                            ...prev,
                            [field.key]: { file, previewUrl }
                          }))
                          // Store filename temporarily for display
                          setCustomData({ ...customData, [field.key]: file.name })
                        }
                      }}
                      disabled={submitting || uploadingImages}
                      className="text-sm"
                    />
                    {pendingImages[field.key] && (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingImages[field.key].previewUrl}
                          alt="Preview"
                          className="max-w-[200px] max-h-[200px] rounded border object-cover"
                        />
                        <p className="text-xs text-muted-foreground">
                          選択: {customData[field.key]}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting || uploadingImages} className="flex-1">
              {uploadingImages ? '画像アップロード中...' : submitting ? 'エントリー中...' : 'エントリーする'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
