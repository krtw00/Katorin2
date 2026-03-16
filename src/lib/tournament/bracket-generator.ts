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
 * Generate double elimination tournament bracket
 *
 * Structure:
 * - Winners Bracket: standard single elimination (W rounds use round 1..N)
 * - Losers Bracket: losers from each WB round feed in (L rounds use round 101..)
 * - Grand Finals: round 201
 *
 * Losers bracket has 2*(N-1) rounds for N winners rounds.
 * Odd losers rounds receive drop-downs from winners, even rounds are internal.
 */
export function generateDoubleEliminationBracket(
  tournamentId: string,
  participants: ParticipantWithUser[]
): MatchInsert[] {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are required')
  }

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const wbRounds = Math.log2(bracketSize) // number of winners bracket rounds

  // Sort by seed or entry order
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed
    if (a.seed) return -1
    if (b.seed) return 1
    return a.entry_number - b.entry_number
  })

  // ---- Winners Bracket ----
  // Build round structure
  const wbMatchesByRound: { player1?: string; player2?: string }[][] = []

  // WB Round 1
  const r1: { player1?: string; player2?: string }[] = []
  for (let i = 0; i < bracketSize / 2; i++) {
    r1.push({
      player1: i * 2 < sortedParticipants.length ? sortedParticipants[i * 2].user_id : undefined,
      player2: i * 2 + 1 < sortedParticipants.length ? sortedParticipants[i * 2 + 1].user_id : undefined,
    })
  }
  wbMatchesByRound.push(r1)

  for (let r = 2; r <= wbRounds; r++) {
    const count = wbMatchesByRound[r - 2].length / 2
    const round: { player1?: string; player2?: string }[] = []
    for (let i = 0; i < count; i++) {
      round.push({ player1: undefined, player2: undefined })
    }
    wbMatchesByRound.push(round)
  }

  // ---- Losers Bracket ----
  // LB has 2*(wbRounds-1) rounds
  const lbTotalRounds = 2 * (wbRounds - 1)
  const lbMatchesByRound: { player1?: string; player2?: string }[][] = []

  for (let lr = 1; lr <= lbTotalRounds; lr++) {
    let count: number
    if (lr === 1) {
      // First LB round: receives losers from WB R1 (bracketSize/4 matches)
      count = bracketSize / 4
    } else if (lr % 2 === 0) {
      // Even LB rounds: same match count as previous (receives dropout from WB)
      count = lbMatchesByRound[lr - 2].length
    } else {
      // Odd LB rounds (after first): halve match count
      count = lbMatchesByRound[lr - 2].length / 2
    }
    count = Math.max(1, count)
    const round: { player1?: string; player2?: string }[] = []
    for (let i = 0; i < count; i++) {
      round.push({ player1: undefined, player2: undefined })
    }
    lbMatchesByRound.push(round)
  }

  // ---- Pre-generate IDs ----
  // WB keys: w{round}m{match}
  // LB keys: l{round}m{match}
  // GF key: gf1
  const matchIdMap: Record<string, string> = {}

  for (let r = 0; r < wbRounds; r++) {
    for (let m = 0; m < wbMatchesByRound[r].length; m++) {
      matchIdMap[`w${r + 1}m${m + 1}`] = crypto.randomUUID()
    }
  }
  for (let r = 0; r < lbTotalRounds; r++) {
    for (let m = 0; m < lbMatchesByRound[r].length; m++) {
      matchIdMap[`l${r + 1}m${m + 1}`] = crypto.randomUUID()
    }
  }
  matchIdMap['gf1'] = crypto.randomUUID()

  const matches: MatchInsert[] = []

  // ---- Build WB matches ----
  for (let rIdx = 0; rIdx < wbRounds; rIdx++) {
    const round = rIdx + 1
    const roundMatches = wbMatchesByRound[rIdx]

    for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
      const matchNumber = mIdx + 1
      const data = roundMatches[mIdx]
      const key = `w${round}m${matchNumber}`
      const id = matchIdMap[key]

      // Winner goes to next WB round
      let nextMatchId: string | null = null
      let nextMatchSlot: number | null = null
      if (round < wbRounds) {
        const nextMN = Math.ceil(matchNumber / 2)
        nextMatchId = matchIdMap[`w${round + 1}m${nextMN}`]
        nextMatchSlot = matchNumber % 2 === 1 ? 1 : 2
      } else {
        // WB final winner goes to Grand Finals as player 1
        nextMatchId = matchIdMap['gf1']
        nextMatchSlot = 1
      }

      // Loser goes to LB
      let loserMatchId: string | null = null
      let loserMatchSlot: number | null = null
      if (round === 1 && lbTotalRounds > 0) {
        // WB R1 losers go to LB R1
        const lbMN = Math.ceil(matchNumber / 2)
        loserMatchId = matchIdMap[`l1m${lbMN}`]
        loserMatchSlot = matchNumber % 2 === 1 ? 1 : 2
      } else if (round > 1 && round <= wbRounds) {
        // WB R{n} losers go to LB R{2*(n-1)} (even rounds receive dropdowns)
        const lbRound = 2 * (round - 1)
        if (lbRound <= lbTotalRounds) {
          const lbMN = matchNumber
          loserMatchId = matchIdMap[`l${lbRound}m${lbMN}`]
          // Dropdown from WB fills player 2 (slot 2) of the LB match
          loserMatchSlot = 2
        }
      }

      let status: 'pending' | 'bye' = 'pending'
      if ((data.player1 && !data.player2) || (!data.player1 && data.player2)) {
        status = 'bye'
      }

      matches.push({
        id,
        tournament_id: tournamentId,
        round,
        match_number: matchNumber,
        bracket_side: 'winners',
        player1_id: data.player1 || null,
        player2_id: data.player2 || null,
        player1_score: 0,
        player2_score: 0,
        winner_id: status === 'bye' ? (data.player1 || data.player2 || null) : null,
        status,
        next_match_id: nextMatchId,
        next_match_slot: nextMatchSlot,
        loser_match_id: loserMatchId,
        loser_match_slot: loserMatchSlot,
      })
    }
  }

  // ---- Build LB matches ----
  for (let rIdx = 0; rIdx < lbTotalRounds; rIdx++) {
    const lbRound = rIdx + 1
    const dbRound = 100 + lbRound // LB rounds stored as 101, 102, ...
    const roundMatches = lbMatchesByRound[rIdx]

    for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
      const matchNumber = mIdx + 1
      const key = `l${lbRound}m${matchNumber}`
      const id = matchIdMap[key]

      let nextMatchId: string | null = null
      let nextMatchSlot: number | null = null

      if (lbRound < lbTotalRounds) {
        if (lbRound % 2 === 1) {
          // Odd LB rounds: winner advances to next LB round (even)
          // Match count stays same
          nextMatchId = matchIdMap[`l${lbRound + 1}m${matchNumber}`]
          nextMatchSlot = 1 // LB internal winner fills slot 1
        } else {
          // Even LB rounds: winner advances to next LB round (odd), halving
          const nextMN = Math.ceil(matchNumber / 2)
          nextMatchId = matchIdMap[`l${lbRound + 1}m${nextMN}`]
          nextMatchSlot = matchNumber % 2 === 1 ? 1 : 2
        }
      } else {
        // LB final winner goes to Grand Finals as player 2
        nextMatchId = matchIdMap['gf1']
        nextMatchSlot = 2
      }

      matches.push({
        id,
        tournament_id: tournamentId,
        round: dbRound,
        match_number: matchNumber,
        bracket_side: 'losers',
        player1_id: null,
        player2_id: null,
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: nextMatchId,
        next_match_slot: nextMatchSlot,
      })
    }
  }

  // ---- Grand Finals ----
  matches.push({
    id: matchIdMap['gf1'],
    tournament_id: tournamentId,
    round: 201,
    match_number: 1,
    bracket_side: 'grand_final',
    player1_id: null,
    player2_id: null,
    player1_score: 0,
    player2_score: 0,
    winner_id: null,
    status: 'pending',
    next_match_id: null,
    next_match_slot: null,
  })

  // ---- Process BYEs in WB ----
  const wbMatches = matches.filter((m) => m.bracket_side === 'winners')
  const byeMatches = wbMatches.filter((m) => m.status === 'bye' && m.winner_id)

  for (const byeMatch of byeMatches) {
    // Advance winner
    if (byeMatch.next_match_id && byeMatch.winner_id) {
      const nextMatch = matches.find((m) => m.id === byeMatch.next_match_id)
      if (nextMatch) {
        if (byeMatch.next_match_slot === 1) {
          nextMatch.player1_id = byeMatch.winner_id
        } else if (byeMatch.next_match_slot === 2) {
          nextMatch.player2_id = byeMatch.winner_id
        }
      }
    }
    // BYE matches don't have a real loser, so no LB routing needed
  }

  // Recursive BYE processing for WB
  let changed = true
  while (changed) {
    changed = false
    for (const match of wbMatches) {
      if (match.status !== 'pending') continue
      if (!match.next_match_id) continue

      const hasP1 = !!match.player1_id
      const hasP2 = !!match.player2_id

      if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
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

/**
 * Get the loser ID from a completed match
 */
export function getLoserId(
  match: { player1_id: string | null; player2_id: string | null; winner_id: string | null }
): string | null {
  if (!match.winner_id) return null
  if (match.player1_id === match.winner_id) return match.player2_id
  if (match.player2_id === match.winner_id) return match.player1_id
  return null
}

/**
 * Advance loser to loser bracket match (for double elimination)
 */
export function advanceLoser(
  currentMatch: {
    player1_id: string | null
    player2_id: string | null
    winner_id: string | null
    loser_match_id: string | null
    loser_match_slot: number | null
  },
  allMatches: { id: string; player1_id: string | null; player2_id: string | null }[]
): { id: string; player1_id?: string; player2_id?: string } | null {
  if (!currentMatch.loser_match_id || !currentMatch.winner_id) return null

  const loserId = getLoserId(currentMatch)
  if (!loserId) return null

  const loserMatch = allMatches.find((m) => m.id === currentMatch.loser_match_id)
  if (!loserMatch) return null

  const update: { id: string; player1_id?: string; player2_id?: string } = {
    id: loserMatch.id,
  }

  if (currentMatch.loser_match_slot === 1) {
    update.player1_id = loserId
  } else if (currentMatch.loser_match_slot === 2) {
    update.player2_id = loserId
  }

  return update
}
