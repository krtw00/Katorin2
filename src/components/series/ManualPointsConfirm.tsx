'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { TournamentWithOrganizer } from '@/types/tournament'

type Props = {
  seriesId: string
  tournaments: TournamentWithOrganizer[]
  calculatedTournamentIds: string[]
}

export function ManualPointsConfirm({ tournaments, calculatedTournamentIds }: Props) {
  const t = useTranslations('series.manualPoints')
  const [calculating, setCalculating] = useState<Record<string, boolean>>({})
  const [calculated, setCalculated] = useState<Set<string>>(new Set(calculatedTournamentIds))
  const [error, setError] = useState('')

  const supabase = createClient()

  // Filter to show only completed tournaments
  const completedTournaments = tournaments.filter(t => t.status === 'completed')

  const handleCalculatePoints = async (tournamentId: string) => {
    setCalculating(prev => ({ ...prev, [tournamentId]: true }))
    setError('')

    try {
      // Call the calculate_series_points function via SQL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any).rpc('calculate_series_points', {
        p_tournament_id: tournamentId,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      // Mark as calculated
      setCalculated(prev => new Set([...prev, tournamentId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setCalculating(prev => ({ ...prev, [tournamentId]: false }))
    }
  }

  if (completedTournaments.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="divide-y border rounded-lg">
          {completedTournaments.map(tournament => {
            const isCalculated = calculated.has(tournament.id)
            const isCalculating = calculating[tournament.id]

            return (
              <div key={tournament.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{tournament.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {tournament.start_at
                      ? new Date(tournament.start_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isCalculated ? (
                    <Badge variant="secondary">{t('confirmed')}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCalculatePoints(tournament.id)}
                      disabled={isCalculating}
                    >
                      {isCalculating ? t('calculating') : t('confirm')}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
