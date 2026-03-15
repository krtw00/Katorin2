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
  CardFooter,
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

type Props = {
  matchId: string
  tournamentId: string
  teamId: string
  teamName: string
  orderSize: number
  subCount: number
  members: Member[]
  existingOrders: ExistingOrder[]
}

export function OrderSubmitForm({
  matchId,
  tournamentId,
  teamId,
  teamName,
  orderSize,
  subCount,
  members,
  existingOrders,
}: Props) {
  const totalSlots = orderSize + subCount

  const [slots, setSlots] = useState<OrderSlot[]>(() => {
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
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const isEdit = existingOrders.length > 0

  const updateSlot = (index: number, field: keyof OrderSlot, value: string | boolean) => {
    const updated = [...slots]
    updated[index] = { ...updated[index], [field]: value }
    setSlots(updated)
  }

  const usedPlayerIds = slots.map(s => s.userId).filter(Boolean)

  const handleSubmit = async () => {
    setError('')

    // バリデーション
    for (let i = 0; i < orderSize; i++) {
      if (!slots[i].userId) {
        setError(`メインプレイヤー ${i + 1} を選択してください`)
        return
      }
      if (!slots[i].deckName.trim()) {
        setError(`メインプレイヤー ${i + 1} のデッキ名を入力してください`)
        return
      }
    }

    // 重複チェック
    const playerIds = slots.filter(s => s.userId).map(s => s.userId)
    if (new Set(playerIds).size !== playerIds.length) {
      setError('同じプレイヤーを複数スロットに設定できません')
      return
    }

    setSubmitting(true)

    try {
      // 既存オーダー削除
      if (isEdit) {
        await supabase.from('war_orders').delete()
          .eq('match_id', matchId)
          .eq('team_id', teamId)
      }

      // 新規オーダー挿入
      const orders = slots
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

      const { error: insertError } = await supabase.from('war_orders').insert(orders)
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'オーダー編集' : 'オーダー提出'}</CardTitle>
          <CardDescription>
            {teamName} - メイン{orderSize}名{subCount > 0 ? ` + サブ${subCount}名` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-2 rounded text-sm">{error}</div>
          )}

          {slots.map((slot, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {slot.isSub ? (
                    <Badge variant="outline" className="mr-2">Sub</Badge>
                  ) : (
                    <Badge className="mr-2">{index + 1}</Badge>
                  )}
                  {slot.isSub ? `サブプレイヤー ${index - orderSize + 1}` : `メインプレイヤー ${index + 1}`}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">プレイヤー</label>
                  <select
                    value={slot.userId}
                    onChange={(e) => updateSlot(index, 'userId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    disabled={submitting}
                  >
                    <option value="">選択してください</option>
                    {members.map(m => (
                      <option
                        key={m.userId}
                        value={m.userId}
                        disabled={usedPlayerIds.includes(m.userId) && slot.userId !== m.userId}
                      >
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">デッキ名</label>
                    <Input
                      value={slot.deckName}
                      onChange={(e) => updateSlot(index, 'deckName', e.target.value)}
                      placeholder="例: 天盃龍"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">テーマ</label>
                    <Input
                      value={slot.deckTheme}
                      onChange={(e) => updateSlot(index, 'deckTheme', e.target.value)}
                      placeholder="例: ビート型"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex gap-2">
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
            {submitting ? '提出中...' : isEdit ? 'オーダーを更新' : 'オーダーを提出'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
