'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RealtimeBracket } from '@/components/tournament/RealtimeBracket'
import { TournamentRanking } from '@/components/tournament/TournamentRanking'
import {
  MatchWithPlayers,
  ParticipantWithUser,
  Profile,
} from '@/types/tournament'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/database'

type Tournament = Database['public']['Tables']['tournaments']['Row']

type Props = {
  tournament: Tournament & { organizer: Profile }
  participants: ParticipantWithUser[]
  matches: MatchWithPlayers[]
  defaultTab?: string
  isOrganizer?: boolean
}

export function TournamentTabs({
  tournament,
  participants,
  matches,
  defaultTab = 'overview',
  isOrganizer = false,
}: Props) {
  const t = useTranslations()
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasStarted =
    tournament.status === 'in_progress' || tournament.status === 'completed'

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="overview">{t('tournament.tabs.overview')}</TabsTrigger>
        <TabsTrigger value="bracket" disabled={!hasStarted && matches.length === 0}>
          {t('tournament.tabs.bracket')}
        </TabsTrigger>
        <TabsTrigger value="ranking">
          {hasStarted ? t('tournament.tabs.ranking') : t('tournament.tabs.participants')}
        </TabsTrigger>
      </TabsList>

      {/* 概要タブ */}
      <TabsContent value="overview">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tournament Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('tournament.tabs.info')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tournament.tabs.format')}</span>
                <span>{t('labels.tournamentFormat.' + tournament.tournament_format)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tournament.tabs.matchFormat')}</span>
                <span>{t('labels.matchFormat.' + tournament.match_format)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tournament.tabs.startDate')}</span>
                <span>{formatDate(tournament.start_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tournament.tabs.entryStart')}</span>
                <span>{formatDate(tournament.entry_start_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tournament.tabs.entryEnd')}</span>
                <span>{formatDate(tournament.entry_deadline)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('tournament.tabs.participantCount')}</span>
                <span>
                  {participants.length} / {tournament.max_participants}
                </span>
              </div>
            </div>
          </div>

          {/* Organizer Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('tournament.tabs.organizer')}</h3>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg">
                  {tournament.organizer.display_name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">
                  {tournament.organizer.display_name}
                </p>
              </div>
            </div>

            {tournament.description && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">{t('tournament.tabs.description')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* トーナメント表タブ */}
      <TabsContent value="bracket">
        {matches.length > 0 ? (
          <RealtimeBracket
            tournamentId={tournament.id}
            initialMatches={matches}
            isOrganizer={isOrganizer}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('tournament.tabs.notGenerated')}
          </div>
        )}
      </TabsContent>

      {/* ランキング/参加者タブ */}
      <TabsContent value="ranking">
        <TournamentRanking
          participants={participants}
          matches={matches}
          tournamentStatus={tournament.status}
        />
      </TabsContent>
    </Tabs>
  )
}
