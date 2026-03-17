'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { useTranslations } from 'next-intl'

type Application = {
  id: string
  team_id: string
  team_name: string
  leader_name: string
  member_count: number
  status: string
  message: string | null
  applied_at: string
}

type Props = {
  leagueId: string
  applications: Application[]
}

export function ApplicationManage({ leagueId, applications: initialApps }: Props) {
  const t = useTranslations('leagues.application')
  const [apps, setApps] = useState(initialApps)
  const [processing, setProcessing] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAction = async (appId: string, teamId: string, action: 'approved' | 'rejected') => {
    setProcessing(appId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 申請ステータス更新
    const { error: updateError } = await supabase
      .from('team_applications')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', appId)

    if (updateError) {
      console.error('Failed to update application:', updateError)
      setProcessing(null)
      return
    }

    // 承認時: チームをシリーズに紐づけ + 配下大会にエントリー
    if (action === 'approved') {
      await supabase
        .from('teams')
        .update({ league_id: leagueId })
        .eq('id', teamId)

      // シリーズ配下の大会を取得してエントリー作成
      const { data: tournaments } = await supabase
        .from('rounds')
        .select('id')
        .eq('league_id', leagueId)

      if (tournaments?.length) {
        const entries = tournaments.map(t => ({
          round_id: t.id,
          team_id: teamId,
        }))
        await supabase.from('team_entries').upsert(entries, { onConflict: 'round_id,team_id' })
      }
    }

    // UI更新
    setApps(prev => prev.map(a =>
      a.id === appId ? { ...a, status: action } : a
    ))
    setProcessing(null)
    router.refresh()
  }

  const pending = apps.filter(a => a.status === 'pending')
  const decided = apps.filter(a => a.status !== 'pending')

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">{t('approved')}</Badge>
      case 'rejected': return <Badge variant="destructive">{t('rejected')}</Badge>
      default: return <Badge variant="outline">{t('pending')}</Badge>
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('empty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 審査待ち */}
      {pending.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {pending.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.team_name}</span>
                      <span className="text-xs text-muted-foreground">{app.member_count}名</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('leader')} {app.leader_name} / {formatDate(app.applied_at)}
                    </p>
                    {app.message && (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1 mt-1">
                        {app.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(app.id, app.team_id, 'rejected')}
                      disabled={processing === app.id}
                    >
                      {t('reject')}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(app.id, app.team_id, 'approved')}
                      disabled={processing === app.id}
                    >
                      {processing === app.id ? t('approving') : t('approve')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 処理済み */}
      {decided.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {decided.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {statusBadge(app.status)}
                    <span className="font-medium">{app.team_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
