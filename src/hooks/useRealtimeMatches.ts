'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { MatchWithPlayers } from '@/types/tournament'

export function useRealtimeMatches(
  tournamentId: string,
  initialMatches: MatchWithPlayers[]
) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>(initialMatches)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      // Subscribe to match changes for this tournament
      channel = supabase
        .channel(`tournament:${tournamentId}:matches`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${tournamentId}`,
          },
          async (payload) => {
            // Refetch matches when there's a change
            const { data: updatedMatches } = await supabase
              .from('matches')
              .select(
                `
                *,
                player1:profiles!matches_player1_id_fkey(*),
                player2:profiles!matches_player2_id_fkey(*),
                winner:profiles!matches_winner_id_fkey(*)
              `
              )
              .eq('tournament_id', tournamentId)
              .order('round', { ascending: true })
              .order('match_number', { ascending: true })

            if (updatedMatches) {
              setMatches(updatedMatches as any)
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tournamentId])

  return matches
}

export function useRealtimeParticipants(
  tournamentId: string,
  initialCount: number
) {
  const [participantCount, setParticipantCount] = useState(initialCount)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      // Subscribe to participant changes for this tournament
      channel = supabase
        .channel(`tournament:${tournamentId}:participants`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'participants',
            filter: `tournament_id=eq.${tournamentId}`,
          },
          async () => {
            // Refetch participant count when there's a change
            const { count } = await supabase
              .from('participants')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', tournamentId)

            if (count !== null) {
              setParticipantCount(count)
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tournamentId])

  return participantCount
}
