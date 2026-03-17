import { z } from 'zod'

export const TIEBREAKER_OPTIONS = [
  'win_points',
  'round_diff',
  'match_diff',
  'individual_diff',
  'total_rounds_won',
  'head_to_head',
  'team_points',
] as const

const byeScoreSchema = z.object({
  roundWins: z.number().min(0).default(2),
  roundLosses: z.number().min(0).default(0),
  matchWins: z.number().min(0).default(0),
  matchLosses: z.number().min(0).default(0),
})

const forfeitScoreSchema = z.object({
  winnerRoundWins: z.number().min(0).default(2),
  loserRoundWins: z.number().min(0).default(0),
  winnerMatchWins: z.number().min(0).default(0),
  loserMatchWins: z.number().min(0).default(0),
})

const scoringSchema = z.object({
  winPoints: z.number().default(3),
  lossPoints: z.number().default(0),
  teamPointThreshold: z.number().optional(),
  tiebreakers: z.array(z.string()).default([]),
  byeScore: byeScoreSchema.default({ roundWins: 2, roundLosses: 0, matchWins: 0, matchLosses: 0 }),
  forfeitScore: forfeitScoreSchema.default({ winnerRoundWins: 2, loserRoundWins: 0, winnerMatchWins: 0, loserMatchWins: 0 }),
})

const finalsSchema = z.object({
  format: z.enum(['single_elimination', 'double_elimination']).default('single_elimination'),
  qualifiedCount: z.number().optional(),
  qualifiedPerBlock: z.array(z.union([z.number(), z.string()])).optional(),
})

export const leagueConfigSchema = z.object({
  orderSize: z.number().min(1).max(10).default(3),
  subCount: z.number().min(0).max(5).default(1),
  playersPerRound: z.number().min(1).max(10).default(3),

  banPickEnabled: z.boolean().default(false),
  banCount: z.number().min(0).optional(),
  pickCount: z.number().min(0).optional(),
  duplicateThemeAllowed: z.boolean().default(true),

  qualifierFormat: z.enum(['round_robin', 'swiss']).default('round_robin'),
  blockCount: z.number().min(1).default(1),
  roundsToWin: z.number().min(1).nullable().default(2),
  roundCount: z.number().min(1).optional(),
  matchFormat: z.enum(['bo1', 'bo3', 'bo5']).default('bo3'),

  scoring: scoringSchema.default({
    winPoints: 3,
    lossPoints: 0,
    tiebreakers: [],
    byeScore: { roundWins: 2, roundLosses: 0, matchWins: 0, matchLosses: 0 },
    forfeitScore: { winnerRoundWins: 2, loserRoundWins: 0, winnerMatchWins: 0, loserMatchWins: 0 },
  }),
  finals: finalsSchema.optional(),

  memberChangeAllowed: z.boolean().default(false),
  maxMemberChanges: z.number().min(0).optional(),
})

export type LeagueConfig = z.infer<typeof leagueConfigSchema>

export function parseLeagueConfig(raw: unknown): LeagueConfig {
  return leagueConfigSchema.parse(raw)
}

/** 総当たり星取戦プリセット: 3v3 BO3 / ブロック別総当たり / メイン3+サブ1 */
export const ROUND_ROBIN_POINT_BATTLE_CONFIG: LeagueConfig = parseLeagueConfig({
  orderSize: 3,
  subCount: 1,
  playersPerRound: 3,
  banPickEnabled: false,
  duplicateThemeAllowed: true,
  qualifierFormat: 'round_robin',
  blockCount: 2,
  roundsToWin: 2,
  matchFormat: 'bo3',
  scoring: {
    winPoints: 3,
    lossPoints: 0,
    tiebreakers: [
      'win_points',
      'round_diff',
      'match_diff',
      'individual_diff',
      'total_rounds_won',
      'head_to_head',
    ],
    byeScore: { roundWins: 2, roundLosses: 0, matchWins: 0, matchLosses: 0 },
    forfeitScore: { winnerRoundWins: 2, loserRoundWins: 0, winnerMatchWins: 0, loserMatchWins: 0 },
  },
  finals: {
    format: 'single_elimination',
    qualifiedPerBlock: [1, '2or3'],
  },
  memberChangeAllowed: true,
  maxMemberChanges: 2,
})

// レガシーエイリアス
export const WMGP_CONFIG = ROUND_ROBIN_POINT_BATTLE_CONFIG

/** Ban&Pickスイスドロープリセット: 5人→Ban2Pick3 / スイスドロー / デッキ被り禁止 */
export const BAN_PICK_SWISS_CONFIG: LeagueConfig = parseLeagueConfig({
  orderSize: 5,
  subCount: 0,
  playersPerRound: 3,
  banPickEnabled: true,
  banCount: 2,
  pickCount: 3,
  duplicateThemeAllowed: false,
  qualifierFormat: 'swiss',
  blockCount: 1,
  roundCount: 3,
  roundsToWin: null,
  matchFormat: 'bo1',
  scoring: {
    winPoints: 1,
    lossPoints: 0,
    teamPointThreshold: 5,
    tiebreakers: ['team_points', 'win_points', 'head_to_head'],
    byeScore: { roundWins: 2, roundLosses: 0, matchWins: 0, matchLosses: 0 },
    forfeitScore: { winnerRoundWins: 2, loserRoundWins: 0, winnerMatchWins: 0, loserMatchWins: 0 },
  },
  finals: {
    format: 'single_elimination',
    qualifiedCount: 4,
  },
  memberChangeAllowed: false,
})

export const ROCKET_CUP_CONFIG = BAN_PICK_SWISS_CONFIG
