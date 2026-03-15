import { ParticipantWithUser, MatchInsert } from '@/types/tournament'

/**
 * Generate single elimination tournament bracket
 * @param tournamentId - Tournament ID
 * @param participants - List of participants (should be seeded)
 * @returns Array of match records to insert
 */
export function generateSingleEliminationBracket(
  tournamentId: string,
  participants: ParticipantWithUser[]
): MatchInsert[] {
  const matches: MatchInsert[] = []

  if (participants.length < 2) {
    throw new Error('At least 2 participants are required')
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))

  // Sort by seed (if seeded) or by entry order
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed
    if (a.seed) return -1
    if (b.seed) return 1
    return a.entry_number - b.entry_number
  })

  // Calculate total rounds
  const totalRounds = Math.log2(bracketSize)

  // Generate all matches for all rounds
  const currentRoundMatches: { player1?: string; player2?: string }[] = []

  // Round 1: Create matches with participants
  const round1MatchCount = bracketSize / 2
  for (let i = 0; i < round1MatchCount; i++) {
    const player1Index = i * 2
    const player2Index = i * 2 + 1

    currentRoundMatches.push({
      player1:
        player1Index < sortedParticipants.length
          ? sortedParticipants[player1Index].user_id
          : undefined,
      player2:
        player2Index < sortedParticipants.length
          ? sortedParticipants[player2Index].user_id
          : undefined,
    })
  }

  // Create matches for all rounds
  const allRoundsMatches: { player1?: string; player2?: string }[][] = [
    currentRoundMatches,
  ]

  // Generate subsequent rounds (with TBD players)
  for (let round = 2; round <= totalRounds; round++) {
    const prevRoundMatchCount = allRoundsMatches[round - 2].length
    const thisRoundMatchCount = prevRoundMatchCount / 2
    const thisRoundMatches: { player1?: string; player2?: string }[] = []

    for (let i = 0; i < thisRoundMatchCount; i++) {
      thisRoundMatches.push({
        player1: undefined,
        player2: undefined,
      })
    }

    allRoundsMatches.push(thisRoundMatches)
  }

  // Pre-generate UUIDs for all matches and build key→id mapping
  const matchIdMap: Record<string, string> = {}

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const round = roundIndex + 1
    const roundMatches = allRoundsMatches[roundIndex]
    for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
      const matchNumber = matchIndex + 1
      const key = `r${round}m${matchNumber}`
      matchIdMap[key] = crypto.randomUUID()
    }
  }

  // Convert to database format with proper references
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const round = roundIndex + 1
    const roundMatches = allRoundsMatches[roundIndex]

    for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
      const matchNumber = matchIndex + 1
      const matchData = roundMatches[matchIndex]

      const currentMatchKey = `r${round}m${matchNumber}`
      const generatedMatchId = matchIdMap[currentMatchKey]

      // Determine next match
      let nextMatchId: string | null = null
      let nextMatchSlot: number | null = null

      if (round < totalRounds) {
        const nextMatchNumber = Math.ceil(matchNumber / 2)
        const nextMatchKey = `r${round + 1}m${nextMatchNumber}`
        nextMatchId = matchIdMap[nextMatchKey]
        nextMatchSlot = matchNumber % 2 === 1 ? 1 : 2
      }

      // Determine match status
      let status: 'pending' | 'bye' = 'pending'
      if (matchData.player1 && !matchData.player2) {
        status = 'bye'
      } else if (!matchData.player1 && matchData.player2) {
        status = 'bye'
      }

      const match: MatchInsert = {
        id: generatedMatchId,
        tournament_id: tournamentId,
        round,
        match_number: matchNumber,
        player1_id: matchData.player1 || null,
        player2_id: matchData.player2 || null,
        player1_score: 0,
        player2_score: 0,
        winner_id: status === 'bye' ? matchData.player1 || matchData.player2 || null : null,
        status,
        next_match_id: nextMatchId,
        next_match_slot: nextMatchSlot,
      }

      matches.push(match)
    }
  }

  // BYE勝者を次ラウンドの試合に自動進出させる
  const byeMatches = matches.filter((m) => m.status === 'bye' && m.winner_id)
  for (const byeMatch of byeMatches) {
    if (!byeMatch.next_match_id || !byeMatch.winner_id) continue

    const nextMatch = matches.find((m) => m.id === byeMatch.next_match_id)
    if (!nextMatch) continue

    if (byeMatch.next_match_slot === 1) {
      nextMatch.player1_id = byeMatch.winner_id
    } else if (byeMatch.next_match_slot === 2) {
      nextMatch.player2_id = byeMatch.winner_id
    }
  }

  // 再帰的BYE処理: 連鎖BYEを処理
  let changed = true
  while (changed) {
    changed = false
    for (const match of matches) {
      if (match.status !== 'pending') continue
      if (!match.next_match_id) continue

      const hasPlayer1 = !!match.player1_id
      const hasPlayer2 = !!match.player2_id

      if ((hasPlayer1 && !hasPlayer2) || (!hasPlayer1 && hasPlayer2)) {
        match.status = 'bye'
        match.winner_id = match.player1_id || match.player2_id
        const nextMatch = matches.find((m) => m.id === match.next_match_id)
        if (nextMatch && match.winner_id) {
          if (match.next_match_slot === 1) {
            nextMatch.player1_id = match.winner_id
          } else if (match.next_match_slot === 2) {
            nextMatch.player2_id = match.winner_id
          }
          changed = true
        }
      }
    }
  }

  return matches
}

/**
 * Advance winner to next match
 * Updates the next match with the winner
 */
export function advanceWinner(
  currentMatch: {
    winner_id: string
    next_match_id: string | null
    next_match_slot: number | null
  },
  allMatches: { id: string; player1_id: string | null; player2_id: string | null }[]
): { id: string; player1_id?: string; player2_id?: string } | null {
  if (!currentMatch.next_match_id || !currentMatch.winner_id) {
    return null
  }

  const nextMatch = allMatches.find((m) => m.id === currentMatch.next_match_id)
  if (!nextMatch) {
    return null
  }

  const update: { id: string; player1_id?: string; player2_id?: string } = {
    id: nextMatch.id,
  }

  if (currentMatch.next_match_slot === 1) {
    update.player1_id = currentMatch.winner_id
  } else if (currentMatch.next_match_slot === 2) {
    update.player2_id = currentMatch.winner_id
  }

  return update
}
