'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
import { Tournament } from '@/types/tournament'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default function TournamentEntryPage({ params }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadTournament = async () => {
      const { id } = await params
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('大会が見つかりませんでした')
      } else {
        setTournament(data)
      }
      setLoading(false)
    }

    loadTournament()
  }, [params])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (!user || !tournament) {
        setError('ログインが必要です')
        return
      }

      const formData = new FormData(e.currentTarget)
      const masterDuelId = formData.get('master_duel_id') as string

      // Check if already entered
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        setError('既にエントリーしています')
        return
      }

      // Check if tournament is full
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)

      if (count && count >= tournament.max_participants) {
        setError('定員に達しています')
        return
      }

      // Create entry
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          master_duel_id: masterDuelId || null,
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push(`/tournaments/${tournament.id}`)
    } catch (err) {
      setError('エントリーに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>
              トーナメントにエントリーするにはログインしてください
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full">ログイン</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>エントリー</CardTitle>
          <CardDescription>{tournament.title}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">表示名</label>
              <Input value={profile?.display_name || ''} disabled />
              <p className="text-xs text-muted-foreground">
                プロフィールの表示名が使用されます
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="master_duel_id" className="text-sm font-medium">
                マスターデュエルID（任意）
              </label>
              <Input
                id="master_duel_id"
                name="master_duel_id"
                placeholder="例: 123-456-789"
                disabled={submitting}
                maxLength={20}
                defaultValue={profile?.master_duel_id || ''}
              />
              <p className="text-xs text-muted-foreground">
                ゲーム内で対戦相手を探すために使用されます
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'エントリー中...' : 'エントリーする'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
