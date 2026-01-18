'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Team, TeamFormData } from '@/types/team'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Team
  onSuccess?: () => void
}

export function TeamForm({ mode, initialData, onSuccess }: Props) {
  const t = useTranslations('team.form')
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<TeamFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description || '',
        avatar_url: initialData.avatar_url || undefined,
      }
    }
    return {
      name: '',
      description: '',
    }
  })

  const updateFormData = (field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError(t('loginRequired'))
        return
      }

      if (!formData.name.trim()) {
        setError(t('nameRequired'))
        return
      }

      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('teams')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            avatar_url: formData.avatar_url || null,
            leader_id: user.id,
          })
          .select()
          .single()

        if (insertError) {
          setError(insertError.message)
          return
        }

        // リーダーをメンバーとして登録
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: data.id,
            user_id: user.id,
            role: 'leader',
          })

        if (memberError) {
          setError(memberError.message)
          return
        }

        router.push(`/teams/${data.id}`)
      } else {
        const { data, error: updateError } = await supabase
          .from('teams')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            avatar_url: formData.avatar_url || null,
          })
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
          router.push(`/teams/${data.id}`)
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
              ← {t('back')}
            </Button>
            <h1 className="text-lg font-bold">
              {mode === 'create' ? t('createTitle') : t('editTitle')}
            </h1>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t('saving') : mode === 'edit' ? t('saveChanges') : t('create')}
          </Button>
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder={t('namePlaceholder')}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('avatar')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('avatarComingSoon')}
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
