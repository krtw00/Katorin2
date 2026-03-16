'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  participantId: string
  checkedInAt: string | null
  tournamentStatus: string
}

export function CheckInButton({ participantId, checkedInAt, tournamentStatus }: Props) {
  const t = useTranslations('tournament.checkin')
  const [isCheckedIn, setIsCheckedIn] = useState(!!checkedInAt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canCheckIn = tournamentStatus === 'recruiting'

  const handleCheckIn = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('participants')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('id', participantId)

    if (updateError) {
      setError(t('failed'))
      setLoading(false)
      return
    }

    setIsCheckedIn(true)
    setLoading(false)
  }

  if (!canCheckIn && !isCheckedIn) {
    return null
  }

  if (isCheckedIn) {
    return (
      <Badge variant="secondary">{t('success')}</Badge>
    )
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleCheckIn} disabled={loading}>
        {loading ? t('submitting') : t('submit')}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
