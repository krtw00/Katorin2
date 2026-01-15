import { Database } from './database'
import { Profile } from './tournament'

// DB型（マイグレーション適用後、database.tsに追加される想定）
export type TeamRole = 'leader' | 'member'
export type TeamBattleFormat = 'knockout' | 'point'
export type TeamCreationMode = 'user' | 'organizer'
export type CheckInStatus = 'pending' | 'checked_in' | 'no_show'
export type BracketSide = 'winners' | 'losers' | 'grand_final'

// Team テーブル型
export type Team = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  leader_id: string
  created_at: string
  updated_at: string
}

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type TeamUpdate = Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>

// TeamMember テーブル型
export type TeamMember = {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
}

export type TeamMemberInsert = Omit<TeamMember, 'id' | 'joined_at'> & {
  id?: string
}

// TeamInvite テーブル型
export type TeamInvite = {
  id: string
  team_id: string
  invite_token: string
  expires_at: string
  max_uses: number
  use_count: number
  created_by: string
  created_at: string
}

export type TeamInviteInsert = Omit<TeamInvite, 'id' | 'use_count' | 'created_at'> & {
  id?: string
  use_count?: number
}

// TeamEntry テーブル型
export type TeamEntry = {
  id: string
  tournament_id: string
  team_id: string
  entry_number: number
  check_in_status: CheckInStatus
  checked_in_at: string | null
  seed: number | null
  final_placement: number | null
  created_at: string
}

export type TeamEntryInsert = Omit<TeamEntry, 'id' | 'entry_number' | 'created_at'> & {
  id?: string
}

// TeamRoster テーブル型
export type TeamRoster = {
  id: string
  team_entry_id: string
  user_id: string
  play_order: number
}

export type TeamRosterInsert = Omit<TeamRoster, 'id'> & {
  id?: string
}

// IndividualMatch テーブル型
export type IndividualMatch = {
  id: string
  match_id: string
  play_order: number
  player1_id: string
  player2_id: string
  player1_score: number
  player2_score: number
  winner_id: string | null
  status: Database['public']['Enums']['match_status']
  created_at: string
}

export type IndividualMatchInsert = Omit<IndividualMatch, 'id' | 'created_at'> & {
  id?: string
}

// 拡張型
export type TeamWithLeader = Team & {
  leader: Profile
}

export type TeamWithMembers = Team & {
  leader: Profile
  members: TeamMemberWithUser[]
  _count?: {
    members: number
  }
}

export type TeamMemberWithUser = TeamMember & {
  user: Profile
}

export type TeamEntryWithTeam = TeamEntry & {
  team: Team
}

export type TeamEntryWithDetails = TeamEntry & {
  team: TeamWithMembers
  roster: TeamRosterWithUser[]
}

export type TeamRosterWithUser = TeamRoster & {
  user: Profile
}

export type IndividualMatchWithPlayers = IndividualMatch & {
  player1: Profile
  player2: Profile
  winner: Profile | null
}

export type TeamInviteWithTeam = TeamInvite & {
  team: Team
}

// ステータスラベル
export const teamRoleLabels: Record<TeamRole, string> = {
  leader: 'リーダー',
  member: 'メンバー',
}

export const teamBattleFormatLabels: Record<TeamBattleFormat, string> = {
  knockout: '勝ち抜き戦',
  point: 'ポイント制',
}

export const teamCreationModeLabels: Record<TeamCreationMode, string> = {
  user: 'ユーザー自由',
  organizer: '主催者指定',
}

export const checkInStatusLabels: Record<CheckInStatus, string> = {
  pending: '未チェックイン',
  checked_in: 'チェックイン済み',
  no_show: '欠席',
}

// フォーム型
export type TeamFormData = {
  name: string
  description: string
  avatar_url?: string
}

export type TeamEntryFormData = {
  team_id: string
  roster: { user_id: string; play_order: number }[]
}

// ヘルパー関数
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function isInviteValid(invite: TeamInvite): boolean {
  const now = new Date()
  const expiresAt = new Date(invite.expires_at)
  return expiresAt > now && invite.use_count < invite.max_uses
}
