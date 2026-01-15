'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  TeamWithMembers,
  TeamInvite,
  teamRoleLabels,
  generateInviteToken,
  isInviteValid,
} from '@/types/team'

export default function TeamMembersPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [team, setTeam] = useState<TeamWithMembers | null>(null)
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // 招待作成用
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteMaxUses, setInviteMaxUses] = useState(10)
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState(7)
  const [createdInviteUrl, setCreatedInviteUrl] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    // チーム情報取得
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey(*),
        members:team_members(
          *,
          user:profiles(*)
        )
      `)
      .eq('id', params.id)
      .single()

    if (teamError || !teamData) {
      setError('チームが見つかりません')
      setLoading(false)
      return
    }

    // 権限チェック
    if (teamData.leader_id !== user.id) {
      setError('管理権限がありません')
      setLoading(false)
      return
    }

    setTeam(teamData as TeamWithMembers)

    // 招待一覧取得
    const { data: inviteData } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', params.id)
      .order('created_at', { ascending: false })

    setInvites(inviteData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [params.id])

  const handleCreateInvite = async () => {
    if (!team) return
    setCreatingInvite(true)

    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + inviteExpiresInDays)

    const { data, error: insertError } = await supabase
      .from('team_invites')
      .insert({
        team_id: team.id,
        invite_token: token,
        expires_at: expiresAt.toISOString(),
        max_uses: inviteMaxUses,
        created_by: currentUserId!,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setCreatingInvite(false)
      return
    }

    const inviteUrl = `${window.location.origin}/teams/invite/${token}`
    setCreatedInviteUrl(inviteUrl)
    setInvites(prev => [data, ...prev])
    setCreatingInvite(false)
  }

  const handleDeleteInvite = async (inviteId: string) => {
    const { error: deleteError } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', inviteId)

    if (!deleteError) {
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === team?.leader_id) {
      setError('リーダーは削除できません')
      return
    }

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (!deleteError) {
      setTeam(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.id !== memberId)
      } : null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error && !team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  if (!team) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push(`/teams/${team.id}`)} className="mb-4">
          ← チーム詳細に戻る
        </Button>
        <h1 className="text-2xl font-bold">メンバー管理 - {team.name}</h1>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Members Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            メンバー一覧 ({team.members.length}人)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プレイヤー</TableHead>
                <TableHead>役割</TableHead>
                <TableHead>加入日</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.user.avatar_url || undefined}
                          alt={member.user.display_name}
                        />
                        <AvatarFallback>
                          {member.user.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.user.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                      {teamRoleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    {member.user_id !== team.leader_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                      >
                        除外
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invites Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">招待リンク</CardTitle>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreatedInviteUrl('')}>
                新しい招待リンクを作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>招待リンクを作成</DialogTitle>
              </DialogHeader>

              {createdInviteUrl ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    招待リンクが作成されました。このリンクを共有してください。
                  </p>
                  <div className="flex gap-2">
                    <Input value={createdInviteUrl} readOnly className="flex-1" />
                    <Button onClick={() => copyToClipboard(createdInviteUrl)}>
                      コピー
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setInviteDialogOpen(false)
                      setCreatedInviteUrl('')
                    }}
                  >
                    閉じる
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>最大使用回数</Label>
                    <Input
                      type="number"
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(parseInt(e.target.value) || 1)}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>有効期限（日数）</Label>
                    <Input
                      type="number"
                      value={inviteExpiresInDays}
                      onChange={(e) => setInviteExpiresInDays(parseInt(e.target.value) || 1)}
                      min={1}
                      max={30}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateInvite}
                    disabled={creatingInvite}
                  >
                    {creatingInvite ? '作成中...' : '招待リンクを作成'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {invites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トークン</TableHead>
                  <TableHead>使用回数</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const valid = isInviteValid(invite)
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono text-xs">
                        {invite.invite_token.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {invite.use_count} / {invite.max_uses}
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={valid ? 'default' : 'secondary'}>
                          {valid ? '有効' : '無効'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {valid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                `${window.location.origin}/teams/invite/${invite.invite_token}`
                              )}
                            >
                              コピー
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              招待リンクはまだありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
