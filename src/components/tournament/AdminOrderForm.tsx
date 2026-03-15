'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Member = {
  userId: string
  displayName: string
}

type ExistingOrder = {
  slot: number
  userId: string
  deckName: string
  deckTheme: string
  isSub: boolean
}

type OrderSlot = {
  userId: string
  deckName: string
  deckTheme: string
  isSub: boolean
}

type TeamData = {
  teamId: string
  teamName: string
  members: Member[]
  existingOrders: ExistingOrder[]
}

type Props = {
  matchId: string
  tournamentId: string
  orderSize: number
  subCount: number
  team1: TeamData
  team2: TeamData
}

function TeamOrderSection({
  team,
  orderSize,
  subCount,
  slots,
  onUpdateSlot,
  submitting,
}: {
  team: TeamData
  orderSize: number
  subCount: number
  slots: OrderSlot[]
  onUpdateSlot: (index: number, field: keyof OrderSlot, value: string | boolean) => void
  submitting: boolean
}) {
  const usedPlayerIds = slots.map(s => s.userId).filter(Boolean)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{team.teamName}</CardTitle>
        <CardDescription>
          メイン{orderSize}名{subCount > 0 ? ` + サブ${subCount}名` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.map((slot, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              {slot.isSub ? (
                <Badge variant="outline">Sub</Badge>
              ) : (
                <Badge>{index + 1}</Badge>
              )}
              <span className="text-sm font-medium">
                {slot.isSub ? `サブ ${index - orderSize + 1}` : `メイン ${index + 1}`}
              </span>
            </div>

            <select
              value={slot.userId}
              onChange={(e) => onUpdateSlot(index, 'userId', e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              disabled={submitting}
            >
              <option value="">プレイヤー選択</option>
              {team.members.map(m => (
                <option
                  key={m.userId}
                  value={m.userId}
                  disabled={usedPlayerIds.includes(m.userId) && slot.userId !== m.userId}
                >
                  {m.displayName}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={slot.deckName}
                onChange={(e) => onUpdateSlot(index, 'deckName', e.target.value)}
                placeholder="デッキ名"
                disabled={submitting}
              />
              <Input
                value={slot.deckTheme}
                onChange={(e) => onUpdateSlot(index, 'deckTheme', e.target.value)}
                placeholder="テーマ"
                disabled={submitting}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function initSlots(
  totalSlots: number,
  orderSize: number,
  existingOrders: ExistingOrder[]
): OrderSlot[] {
  if (existingOrders.length > 0) {
    return Array.from({ length: totalSlots }, (_, i) => {
      const existing = existingOrders.find(o => o.slot === i + 1)
      return {
        userId: existing?.userId || '',
        deckName: existing?.deckName || '',
        deckTheme: existing?.deckTheme || '',
        isSub: existing?.isSub || i >= orderSize,
      }
    })
  }
  return Array.from({ length: totalSlots }, (_, i) => ({
    userId: '',
    deckName: '',
    deckTheme: '',
    isSub: i >= orderSize,
  }))
}

export function AdminOrderForm({
  matchId,
  tournamentId,
  orderSize,
  subCount,
  team1,
  team2,
}: Props) {
  const totalSlots = orderSize + subCount

  const [team1Slots, setTeam1Slots] = useState<OrderSlot[]>(() =>
    initSlots(totalSlots, orderSize, team1.existingOrders)
  )
  const [team2Slots, setTeam2Slots] = useState<OrderSlot[]>(() =>
    initSlots(totalSlots, orderSize, team2.existingOrders)
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const updateTeam1Slot = (index: number, field: keyof OrderSlot, value: string | boolean) => {
    const updated = [...team1Slots]
    updated[index] = { ...updated[index], [field]: value }
    setTeam1Slots(updated)
  }

  const updateTeam2Slot = (index: number, field: keyof OrderSlot, value: string | boolean) => {
    const updated = [...team2Slots]
    updated[index] = { ...updated[index], [field]: value }
    setTeam2Slots(updated)
  }

  const validateSlots = (slots: OrderSlot[], teamName: string): string | null => {
    for (let i = 0; i < orderSize; i++) {
      if (!slots[i].userId) {
        return `${teamName}: メインプレイヤー ${i + 1} を選択してください`
      }
      if (!slots[i].deckName.trim()) {
        return `${teamName}: メインプレイヤー ${i + 1} のデッキ名を入力してください`
      }
    }
    const playerIds = slots.filter(s => s.userId).map(s => s.userId)
    if (new Set(playerIds).size !== playerIds.length) {
      return `${teamName}: 同じプレイヤーが重複しています`
    }
    return null
  }

  const buildOrders = (slots: OrderSlot[], teamId: string) =>
    slots
      .filter(s => s.userId)
      .map((s, i) => ({
        match_id: matchId,
        team_id: teamId,
        slot: i + 1,
        user_id: s.userId,
        deck_name: s.deckName.trim(),
        deck_theme: s.deckTheme.trim(),
        is_sub: s.isSub,
      }))

  const handleSubmit = async () => {
    setError('')

    const err1 = validateSlots(team1Slots, team1.teamName)
    if (err1) { setError(err1); return }
    const err2 = validateSlots(team2Slots, team2.teamName)
    if (err2) { setError(err2); return }

    setSubmitting(true)

    try {
      // 既存オーダー削除（両チーム分）
      await supabase.from('war_orders').delete().eq('match_id', matchId)

      // 両チームのオーダーを一括挿入
      const allOrders = [
        ...buildOrders(team1Slots, team1.teamId),
        ...buildOrders(team2Slots, team2.teamId),
      ]

      const { error: insertError } = await supabase.from('war_orders').insert(allOrders)
      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push(`/tournaments/${tournamentId}/wars/${matchId}`)
    } catch {
      setError('オーダー提出に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = team1.existingOrders.length > 0 || team2.existingOrders.length > 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'オーダー編集' : 'オーダー入力'}（管理者）
      </h1>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamOrderSection
          team={team1}
          orderSize={orderSize}
          subCount={subCount}
          slots={team1Slots}
          onUpdateSlot={updateTeam1Slot}
          submitting={submitting}
        />
        <TeamOrderSection
          team={team2}
          orderSize={orderSize}
          subCount={subCount}
          slots={team2Slots}
          onUpdateSlot={updateTeam2Slot}
          submitting={submitting}
        />
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {submitting ? '提出中...' : isEdit ? '両チームのオーダーを更新' : '両チームのオーダーを提出'}
        </Button>
      </div>
    </div>
  )
}
