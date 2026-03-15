'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Props = {
  seriesId: string
}

type MyTeam = {
  id: string
  name: string
  alreadyApplied: boolean
  alreadyInSeries: boolean
}

export function TeamApplicationForm({ seriesId }: Props) {
  const [teams, setTeams] = useState<MyTeam[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // 自分がリーダーのチーム
      const { data: myTeams } = await supabase
        .from('teams')
        .select('id, name, series_id')
        .eq('leader_id', user.id)

      // このシリーズへの既存申請
      const { data: applications } = await supabase
        .from('team_applications')
        .select('team_id, status')
        .eq('series_id', seriesId)

      const appliedTeamIds = new Set((applications || []).map(a => a.team_id))

      setTeams((myTeams || []).map(t => ({
        id: t.id,
        name: t.name,
        alreadyApplied: appliedTeamIds.has(t.id),
        alreadyInSeries: t.series_id === seriesId,
      })))
      setLoading(false)
    }
    load()
  }, [seriesId, supabase])

  const availableTeams = teams.filter(t => !t.alreadyApplied && !t.alreadyInSeries)

  const handleSubmit = async () => {
    if (!selectedTeamId) { setError('チームを選択してください'); return }
    setError('')
    setSubmitting(true)

    const { error: insertError } = await supabase
      .from('team_applications')
      .insert({
        series_id: seriesId,
        team_id: selectedTeamId,
        message: message.trim() || null,
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.refresh(), 1000)
  }

  if (loading) return null

  if (success) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-green-600 font-medium">エントリー申請を送信しました</p>
          <p className="text-sm text-muted-foreground mt-1">主催者の承認をお待ちください</p>
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>リーダーを務めるチームがありません</p>
          <p className="text-sm mt-1">先にチームを作成してください</p>
        </CardContent>
      </Card>
    )
  }

  if (availableTeams.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>申請可能なチームがありません</p>
          <p className="text-sm mt-1">全チームが申請済みまたは参加済みです</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">エントリー申請</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded text-sm">{error}</div>
        )}

        <div>
          <label className="text-sm font-medium mb-1 block">チーム選択</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            disabled={submitting}
          >
            <option value="">チームを選択</option>
            {availableTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">メッセージ（任意）</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="主催者へのメッセージ"
            rows={2}
            disabled={submitting}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !selectedTeamId}
          className="w-full"
        >
          {submitting ? '送信中...' : '申請する'}
        </Button>
      </CardContent>
    </Card>
  )
}
