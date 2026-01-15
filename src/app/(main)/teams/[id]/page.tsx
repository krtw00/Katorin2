import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TeamWithMembers, teamRoleLabels } from '@/types/team'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 現在のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser()

  // チーム情報を取得
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      leader:profiles!teams_leader_id_fkey(*),
      members:team_members(
        *,
        user:profiles(*)
      )
    `)
    .eq('id', id)
    .single() as { data: TeamWithMembers | null; error: any }

  if (error || !team) {
    notFound()
  }

  const isLeader = user?.id === team.leader_id
  const isMember = team.members.some(m => m.user_id === user?.id)

  // 参加中の大会を取得
  const { data: teamEntries } = await supabase
    .from('team_entries')
    .select(`
      *,
      tournament:tournaments(id, title, status, start_at)
    `)
    .eq('team_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/teams">
          <Button variant="ghost" className="mb-4">
            ← チーム一覧に戻る
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={team.avatar_url || undefined} alt={team.name} />
              <AvatarFallback className="text-2xl">
                {team.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-muted-foreground">
                リーダー: {team.leader.display_name}
              </p>
            </div>
          </div>

          {isLeader && (
            <div className="flex gap-2">
              <Link href={`/teams/${id}/members`}>
                <Button variant="outline">メンバー管理</Button>
              </Link>
              <Link href={`/teams/${id}/edit`}>
                <Button variant="outline">編集</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">メンバー数</p>
            <p className="text-2xl font-bold">{team.members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">参加大会数</p>
            <p className="text-2xl font-bold">{teamEntries?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">作成日</p>
            <p className="text-lg font-medium">
              {new Date(team.created_at).toLocaleDateString('ja-JP')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">ステータス</p>
            <Badge variant={isMember ? 'default' : 'secondary'}>
              {isMember ? '所属中' : '非メンバー'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="members">メンバー</TabsTrigger>
          <TabsTrigger value="tournaments">大会履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {team.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">チーム紹介</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{team.description}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                チーム紹介はまだ設定されていません
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">大会履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {teamEntries && teamEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>大会名</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>開催日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamEntries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Link
                            href={`/tournaments/${entry.tournament.id}`}
                            className="text-primary hover:underline"
                          >
                            {entry.tournament.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.tournament.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.tournament.start_at
                            ? new Date(entry.tournament.start_at).toLocaleDateString('ja-JP')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  まだ大会に参加していません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
