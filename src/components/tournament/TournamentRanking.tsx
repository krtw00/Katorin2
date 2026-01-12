'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MatchWithPlayers, ParticipantWithUser } from '@/types/tournament'

type Props = {
  participants: ParticipantWithUser[]
  matches: MatchWithPlayers[]
  tournamentStatus: string
}

type RankedParticipant = {
  participant: ParticipantWithUser
  rank: number
  wins: number
  losses: number
  roundReached: number
  isEliminated: boolean
}

function calculateRankings(
  participants: ParticipantWithUser[],
  matches: MatchWithPlayers[]
): RankedParticipant[] {
  // Count wins and losses for each participant
  const stats = new Map<string, { wins: number; losses: number; lastRound: number; isEliminated: boolean }>()

  // Initialize stats for all participants
  participants.forEach((p) => {
    stats.set(p.user_id, { wins: 0, losses: 0, lastRound: 0, isEliminated: false })
  })

  // Calculate stats from completed matches
  matches.forEach((match) => {
    if (match.status !== 'completed' || !match.winner_id) return

    const winnerId = match.winner_id
    const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id

    // Update winner stats
    const winnerStats = stats.get(winnerId)
    if (winnerStats) {
      winnerStats.wins++
      winnerStats.lastRound = Math.max(winnerStats.lastRound, match.round)
    }

    // Update loser stats
    if (loserId) {
      const loserStats = stats.get(loserId)
      if (loserStats) {
        loserStats.losses++
        loserStats.lastRound = Math.max(loserStats.lastRound, match.round)
        loserStats.isEliminated = true
      }
    }
  })

  // Find max round (final)
  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0

  // Create ranked list
  const ranked: RankedParticipant[] = participants.map((p) => {
    const playerStats = stats.get(p.user_id) || { wins: 0, losses: 0, lastRound: 0, isEliminated: false }
    return {
      participant: p,
      rank: 0,
      wins: playerStats.wins,
      losses: playerStats.losses,
      roundReached: playerStats.lastRound,
      isEliminated: playerStats.isEliminated,
    }
  })

  // Sort by:
  // 1. Final placement (if set)
  // 2. Round reached (higher is better)
  // 3. Wins (more is better)
  // 4. Losses (fewer is better)
  ranked.sort((a, b) => {
    // If final placement is set, use it
    if (a.participant.final_placement && b.participant.final_placement) {
      return a.participant.final_placement - b.participant.final_placement
    }
    if (a.participant.final_placement) return -1
    if (b.participant.final_placement) return 1

    // Players who are still in the tournament rank higher
    if (!a.isEliminated && b.isEliminated) return -1
    if (a.isEliminated && !b.isEliminated) return 1

    // Sort by round reached (higher = better)
    if (a.roundReached !== b.roundReached) {
      return b.roundReached - a.roundReached
    }

    // Sort by wins
    if (a.wins !== b.wins) {
      return b.wins - a.wins
    }

    // Sort by losses (fewer is better)
    return a.losses - b.losses
  })

  // Assign ranks
  let currentRank = 1
  ranked.forEach((item, index) => {
    if (index === 0) {
      item.rank = currentRank
    } else {
      const prev = ranked[index - 1]
      // Same rank if same stats
      if (
        item.roundReached === prev.roundReached &&
        item.wins === prev.wins &&
        item.losses === prev.losses &&
        item.isEliminated === prev.isEliminated
      ) {
        item.rank = prev.rank
      } else {
        item.rank = index + 1
      }
    }
  })

  return ranked
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
          🥇 1位
        </Badge>
      )
    case 2:
      return (
        <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
          🥈 2位
        </Badge>
      )
    case 3:
      return (
        <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
          🥉 3位
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {rank}位
        </Badge>
      )
  }
}

export function TournamentRanking({ participants, matches, tournamentStatus }: Props) {
  const rankings = calculateRankings(participants, matches)

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        参加者がいません
      </div>
    )
  }

  const hasStarted = tournamentStatus === 'in_progress' || tournamentStatus === 'completed'

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">順位</TableHead>
            <TableHead>プレイヤー</TableHead>
            {hasStarted && (
              <>
                <TableHead className="text-center w-20">勝利</TableHead>
                <TableHead className="text-center w-20">敗北</TableHead>
                <TableHead className="text-center w-24">状態</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow
              key={item.participant.id}
              className={item.rank <= 3 ? 'bg-muted/30' : ''}
            >
              <TableCell>
                {hasStarted ? (
                  getRankBadge(item.rank)
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(item.participant.display_name || item.participant.user.display_name).substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {item.participant.display_name || item.participant.user.display_name}
                    </div>
                  </div>
                </div>
              </TableCell>
              {hasStarted && (
                <>
                  <TableCell className="text-center font-mono">
                    {item.wins}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.losses}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.isEliminated ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        敗退
                      </Badge>
                    ) : item.wins > 0 || item.losses > 0 ? (
                      <Badge variant="default">
                        勝ち残り
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        待機中
                      </Badge>
                    )}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
