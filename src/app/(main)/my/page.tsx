import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { TournamentWithOrganizer } from '@/types/tournament'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function MyPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get tournaments organized by user
  const { data: organizedTournaments } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey(*)
    `
    )
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  // Get tournaments user is participating in
  const { data: participations } = await supabase
    .from('participants')
    .select(
      `
      *,
      tournament:tournaments(
        *,
        organizer:profiles!tournaments_organizer_id_fkey(*)
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const participatingTournaments = participations?.map((p: any) => p.tournament).filter(Boolean) || []

  // Get participant counts for all tournaments
  const allTournamentIds = [
    ...(organizedTournaments?.map((t) => t.id) || []),
    ...participatingTournaments.map((t: any) => t.id),
  ]

  const { data: participantCounts } = await supabase
    .from('participants')
    .select('tournament_id')
    .in('tournament_id', allTournamentIds)

  const countMap = new Map<string, number>()
  participantCounts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1)
  })

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-2xl">
                {profile?.display_name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.display_name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile?.master_duel_id && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">
                マスターデュエルID:
              </span>
              <span className="text-sm">{profile.master_duel_id}</span>
            </div>
          )}
          {profile?.discord_id && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Discord:</span>
              <span className="text-sm">{profile.discord_id}</span>
            </div>
          )}
          {profile?.bio && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournaments Tabs */}
      <Tabs defaultValue="participating" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participating">参加中の大会</TabsTrigger>
          <TabsTrigger value="organizing">主催している大会</TabsTrigger>
        </TabsList>

        {/* Participating Tournaments */}
        <TabsContent value="participating" className="space-y-4">
          {participatingTournaments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {participatingTournaments.map((tournament: any) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament as TournamentWithOrganizer}
                  participantCount={countMap.get(tournament.id) || 0}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  参加している大会がありません
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Organized Tournaments */}
        <TabsContent value="organizing" className="space-y-4">
          {organizedTournaments && organizedTournaments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizedTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament as TournamentWithOrganizer}
                  participantCount={countMap.get(tournament.id) || 0}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  主催している大会がありません
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
