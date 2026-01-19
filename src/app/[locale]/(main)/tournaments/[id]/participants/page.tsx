import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ParticipantWithUser } from '@/types/tournament'
import { ChevronLeft } from 'lucide-react'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ParticipantsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch tournament details
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, title')
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // Fetch participants with user details
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('tournament_id', id)
    .order('entry_number', { ascending: true })

  if (participantsError) {
    console.error('Failed to fetch participants:', participantsError)
  }

  const participantList = (participants as ParticipantWithUser[]) || []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/tournaments/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            大会詳細に戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tournament.title} - 参加者一覧</CardTitle>
          <CardDescription>
            全{participantList.length}名の参加者
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participantList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              参加者がいません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">No.</TableHead>
                    <TableHead>参加者</TableHead>
                    <TableHead className="hidden sm:table-cell">登録日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantList.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-mono">
                        {participant.entry_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {(participant.display_name || participant.user.display_name).substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {participant.display_name || participant.user.display_name}
                            </div>
                            {participant.master_duel_id && (
                              <div className="text-sm text-muted-foreground">
                                ID: {participant.master_duel_id}
                              </div>
                            )}
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              {formatDate(participant.created_at)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(participant.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
