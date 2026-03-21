import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database'

type SupaClient = SupabaseClient<Database>

export type LeagueOrganizerRole = 'owner' | 'admin' | 'staff' | null

export function canManageLeagueMembers(role: LeagueOrganizerRole) {
  return role === 'owner' || role === 'admin'
}

export function canManageLeague(role: LeagueOrganizerRole) {
  return role === 'owner' || role === 'admin'
}

export function canOperateLeague(role: LeagueOrganizerRole) {
  return role === 'owner' || role === 'admin' || role === 'staff'
}

export async function getLeagueOrganizerRole(
  supabase: SupaClient,
  leagueId: string,
  userId?: string | null
): Promise<LeagueOrganizerRole> {
  if (!userId) return null

  const { data: league } = await supabase
    .from('leagues')
    .select('organizer_id')
    .eq('id', leagueId)
    .single()

  if (!league) return null
  if (league.organizer_id === userId) return 'owner'

  const { data: member } = await supabase
    .from('league_organizer_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (member?.role === 'admin' || member?.role === 'staff') {
    return member.role
  }

  return null
}

export async function getRoundOrganizerRole(
  supabase: SupaClient,
  roundId: string,
  userId?: string | null
): Promise<LeagueOrganizerRole> {
  if (!userId) return null

  const { data: round } = await supabase
    .from('rounds')
    .select('organizer_id, league_id')
    .eq('id', roundId)
    .single()

  if (!round) return null
  if (round.organizer_id === userId) return 'owner'
  if (!round.league_id) return null

  return getLeagueOrganizerRole(supabase, round.league_id, userId)
}
