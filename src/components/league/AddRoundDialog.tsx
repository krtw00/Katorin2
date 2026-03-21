'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type RoundFormat = 'round_robin' | 'swiss' | 'single_elimination' | 'double_elimination'

type ExistingRound = {
  id: string
  title: string
  round_order: number | null
}

type Props = {
  leagueId: string
  rounds: ExistingRound[]
}

export function AddRoundDialog({ leagueId, rounds }: Props) {
  const t = useTranslations('leagues')
  const tc = useTranslations('common')
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<RoundFormat>('round_robin')
  const [isFinals, setIsFinals] = useState(false)
  const [sourceRoundId, setSourceRoundId] = useState('')
  const [qualifiedPerBlock, setQualifiedPerBlock] = useState('')
  const [qualifiedTotal, setQualifiedTotal] = useState('')

  const sourceRounds = useMemo(
    () => [...rounds].sort((a, b) => (a.round_order ?? 999) - (b.round_order ?? 999)),
    [rounds]
  )

  useEffect(() => {
    if (!isFinals) {
      setSourceRoundId('')
      setQualifiedPerBlock('')
      setQualifiedTotal('')
    }
  }, [isFinals])

  useEffect(() => {
    if (!sourceRoundId) {
      setQualifiedPerBlock('')
      setQualifiedTotal('')
    }
  }, [sourceRoundId])

  const resetForm = () => {
    setTitle('')
    setFormat('round_robin')
    setIsFinals(false)
    setSourceRoundId('')
    setQualifiedPerBlock('')
    setQualifiedTotal('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError(tc('loginRequired'))
        return
      }

      const { error: insertError } = await supabase
        .from('rounds')
        .insert({
          league_id: leagueId,
          organizer_id: user.id,
          title: trimmedTitle,
          format,
          is_finals: isFinals,
          source_round_id: isFinals ? sourceRoundId || null : null,
          qualified_per_block:
            isFinals && sourceRoundId && qualifiedPerBlock
              ? Number(qualifiedPerBlock)
              : null,
          qualified_total:
            isFinals && sourceRoundId && format === 'swiss' && qualifiedTotal
              ? Number(qualifiedTotal)
              : null,
          round_order: rounds.length + 1,
          entry_type: 'team',
          status: 'draft',
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setOpen(false)
      resetForm()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">{t('addRound.title')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addRound.title')}</DialogTitle>
          <DialogDescription>{t('detail.tournaments')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="round-title">{t('addRound.name')}</Label>
            <Input
              id="round-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('addRound.namePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="round-format">{t('addRound.format')}</Label>
            <select
              id="round-format"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={format}
              onChange={(e) => setFormat(e.target.value as RoundFormat)}
              required
            >
              <option value="round_robin">{t('addRound.formatOptions.round_robin')}</option>
              <option value="swiss">{t('addRound.formatOptions.swiss')}</option>
              <option value="single_elimination">{t('addRound.formatOptions.single_elimination')}</option>
              <option value="double_elimination">{t('addRound.formatOptions.double_elimination')}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFinals}
              onChange={(e) => setIsFinals(e.target.checked)}
            />
            {t('addRound.isFinals')}
          </label>

          {isFinals && (
            <div className="space-y-2">
              <Label htmlFor="source-round">{t('addRound.sourceRound')}</Label>
              <select
                id="source-round"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                value={sourceRoundId}
                onChange={(e) => setSourceRoundId(e.target.value)}
              >
                <option value="">--</option>
                {sourceRounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.round_order ? `#${round.round_order} ` : ''}
                    {round.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sourceRoundId && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qualified-per-block">{t('addRound.qualifiedPerBlock')}</Label>
                <Input
                  id="qualified-per-block"
                  type="number"
                  min="1"
                  value={qualifiedPerBlock}
                  onChange={(e) => setQualifiedPerBlock(e.target.value)}
                />
              </div>

              {format === 'swiss' && (
                <div className="space-y-2">
                  <Label htmlFor="qualified-total">{t('addRound.qualifiedTotal')}</Label>
                  <Input
                    id="qualified-total"
                    type="number"
                    min="1"
                    value={qualifiedTotal}
                    onChange={(e) => setQualifiedTotal(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? t('addRound.adding') : t('addRound.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
