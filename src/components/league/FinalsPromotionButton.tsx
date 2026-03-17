'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { getQualifiedTeams } from '@/lib/tournament/finals-promotion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type FinalsRoundInfo = {
  id: string
  source_round_id: string
  qualified_per_block: number | null
  qualified_total: number | null
  source_round_status: string
}

type Props = { finalsRound: FinalsRoundInfo }

export function FinalsPromotionButton({ finalsRound }: Props) {
  const t = useTranslations('leagues.finals')
  const tc = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qualifiedTeams, setQualifiedTeams] = useState<string[]>([])
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const isSourceCompleted = finalsRound.source_round_status === 'completed'

  const handleOpenDialog = async () => {
    if (!isSourceCompleted) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const teams = await getQualifiedTeams(supabase, {
        source_round_id: finalsRound.source_round_id,
        qualified_per_block: finalsRound.qualified_per_block,
        qualified_total: finalsRound.qualified_total,
      })

      if (teams.length === 0) {
        setError(t('noQualified'))
        setOpen(true)
        return
      }

      const { data: teamData } = await supabase.from('teams').select('id, name').in('id', teams)
      const names: Record<string, string> = {}
      teamData?.forEach((team) => {
        names[team.id] = team.name
      })

      setQualifiedTeams(teams)
      setTeamNames(names)
      setOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('noQualified'))
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const entries = qualifiedTeams.map((teamId, index) => ({
        team_id: teamId,
        round_id: finalsRound.id,
        seed: index + 1,
      }))

      const { error: upsertError } = await supabase
        .from('team_entries')
        .upsert(entries, { onConflict: 'round_id,team_id' })

      if (upsertError) {
        setError(upsertError.message)
        return
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!isSourceCompleted) {
    return (
      <Button variant="outline" size="sm" disabled>
        {t('sourceNotCompleted')}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={handleOpenDialog} disabled={loading}>
          {loading ? t('promoting') : t('promote')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmTitle')}</DialogTitle>
          <DialogDescription>
            {error || t('confirmDescription', { count: qualifiedTeams.length })}
          </DialogDescription>
        </DialogHeader>

        {!error && qualifiedTeams.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            <div className="divide-y rounded-lg border">
              {qualifiedTeams.map((teamId, index) => (
                <div key={teamId} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-6 text-sm font-medium text-muted-foreground">{index + 1}</span>
                  <span className="text-sm font-medium">{teamNames[teamId] || teamId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc('cancel')}
          </Button>
          {!error && qualifiedTeams.length > 0 && (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? t('promoting') : t('promote')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
