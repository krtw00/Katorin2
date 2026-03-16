'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  participantId: string
  checkedInAt: string | null
  tournamentStatus: string
}

export function CheckInButton({ participantId, checkedInAt, tournamentStatus }: Props) {
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
      setError('チェックインに失敗しました')
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
      <Badge variant="secondary">チェックイン済み</Badge>
    )
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleCheckIn} disabled={loading}>
        {loading ? 'チェックイン中...' : 'チェックインする'}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
