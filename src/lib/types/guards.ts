/**
 * 型ガード関数
 * Supabase からのレスポンスや外部データを型安全に扱うためのユーティリティ
 */

import {
  CustomField,
  InputType,
  EditDeadline,
  Tournament,
  TournamentStatus,
  TournamentFormat,
  Participant,
  Match,
  ParticipantWithUser,
  MatchWithPlayers,
} from '@/types/tournament'

/**
 * InputType の型ガード
 */
export function isInputType(value: unknown): value is InputType {
  return typeof value === 'string' && ['text', 'checkbox', 'image'].includes(value)
}

/**
 * EditDeadline の型ガード
 */
export function isEditDeadline(value: unknown): value is EditDeadline {
  return (
    typeof value === 'string' &&
    ['entry_closed', 'entry_period', 'bracket_published', 'event_end'].includes(value)
  )
}

/**
 * CustomField の型ガード
 */
export function isCustomField(data: unknown): data is CustomField {
  if (typeof data !== 'object' || data === null) return false

  const field = data as Record<string, unknown>

  return (
    typeof field.key === 'string' &&
    typeof field.label === 'string' &&
    isInputType(field.inputType) &&
    typeof field.required === 'boolean' &&
    typeof field.hidden === 'boolean' &&
    isEditDeadline(field.editDeadline) &&
    typeof field.placeholder === 'string' &&
    (field.options === undefined ||
      (Array.isArray(field.options) && field.options.every((opt) => typeof opt === 'string')))
  )
}

/**
 * CustomField配列の型ガード
 */
export function isCustomFieldArray(data: unknown): data is CustomField[] {
  if (!Array.isArray(data)) return false
  return data.every(isCustomField)
}

/**
 * TournamentStatus の型ガード
 */
export function isTournamentStatus(value: unknown): value is TournamentStatus {
  return (
    typeof value === 'string' &&
    ['draft', 'published', 'recruiting', 'in_progress', 'completed', 'cancelled'].includes(value)
  )
}

/**
 * TournamentFormat の型ガード
 */
export function isTournamentFormat(value: unknown): value is TournamentFormat {
  return (
    typeof value === 'string' &&
    ['single_elimination', 'double_elimination', 'swiss', 'round_robin'].includes(value)
  )
}

/**
 * Tournament の型ガード
 */
export function isTournament(data: unknown): data is Tournament {
  if (typeof data !== 'object' || data === null) return false

  const tournament = data as Record<string, unknown>

  return (
    typeof tournament.id === 'string' &&
    typeof tournament.title === 'string' &&
    isTournamentStatus(tournament.status) &&
    isTournamentFormat(tournament.tournament_format)
  )
}

/**
 * Tournament配列の型ガード
 */
export function isTournamentArray(data: unknown): data is Tournament[] {
  if (!Array.isArray(data)) return false
  return data.every(isTournament)
}

/**
 * Participant の型ガード
 */
export function isParticipant(data: unknown): data is Participant {
  if (typeof data !== 'object' || data === null) return false

  const participant = data as Record<string, unknown>

  return (
    typeof participant.id === 'string' &&
    typeof participant.tournament_id === 'string' &&
    typeof participant.user_id === 'string'
  )
}

/**
 * ParticipantWithUser の型ガード
 */
export function isParticipantWithUser(data: unknown): data is ParticipantWithUser {
  if (typeof data !== 'object' || data === null) return false

  const participant = data as Record<string, unknown>

  return (
    isParticipant(data) &&
    typeof participant.user === 'object' &&
    participant.user !== null &&
    typeof (participant.user as Record<string, unknown>).id === 'string'
  )
}

/**
 * ParticipantWithUser配列の型ガード
 */
export function isParticipantWithUserArray(data: unknown): data is ParticipantWithUser[] {
  if (!Array.isArray(data)) return false
  return data.every(isParticipantWithUser)
}

/**
 * Match の型ガード
 */
export function isMatch(data: unknown): data is Match {
  if (typeof data !== 'object' || data === null) return false

  const match = data as Record<string, unknown>

  return (
    typeof match.id === 'string' &&
    typeof match.tournament_id === 'string' &&
    typeof match.round === 'number' &&
    typeof match.match_number === 'number'
  )
}

/**
 * MatchWithPlayers の型ガード
 */
export function isMatchWithPlayers(data: unknown): data is MatchWithPlayers {
  if (!isMatch(data)) return false

  const match = data as Record<string, unknown>

  // player1, player2, winner は null の可能性があるため、存在する場合のみチェック
  const isValidPlayer = (player: unknown) =>
    player === null ||
    (typeof player === 'object' && player !== null && typeof (player as Record<string, unknown>).id === 'string')

  return isValidPlayer(match.player1) && isValidPlayer(match.player2) && isValidPlayer(match.winner)
}

/**
 * MatchWithPlayers配列の型ガード
 */
export function isMatchWithPlayersArray(data: unknown): data is MatchWithPlayers[] {
  if (!Array.isArray(data)) return false
  return data.every(isMatchWithPlayers)
}

/**
 * 不明なデータから CustomField[] をパース
 * 型ガードに失敗した場合はエラーをスロー
 */
export function parseCustomFields(data: unknown): CustomField[] {
  if (data === null || data === undefined) return []

  if (isCustomFieldArray(data)) {
    return data
  }

  throw new Error('Invalid custom fields data')
}

/**
 * 不明なデータから ParticipantWithUser[] をパース
 */
export function parseParticipantsWithUser(data: unknown): ParticipantWithUser[] {
  if (data === null || data === undefined) return []

  if (isParticipantWithUserArray(data)) {
    return data
  }

  throw new Error('Invalid participants data')
}

/**
 * 不明なデータから MatchWithPlayers[] をパース
 */
export function parseMatchesWithPlayers(data: unknown): MatchWithPlayers[] {
  if (data === null || data === undefined) return []

  if (isMatchWithPlayersArray(data)) {
    return data
  }

  throw new Error('Invalid matches data')
}
