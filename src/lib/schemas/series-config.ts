import { z } from 'zod'

const scoringSchema = z.object({
  winPoints: z.number().default(3),
  lossPoints: z.number().default(0),
  teamPointThreshold: z.number().optional(),
  tiebreakers: z.array(z.string()).default([]),
})

const finalsSchema = z.object({
  format: z.enum(['single_elimination', 'double_elimination']).default('single_elimination'),
  qualifiedCount: z.number().optional(),
  qualifiedPerBlock: z.array(z.union([z.number(), z.string()])).optional(),
})

export const seriesConfigSchema = z.object({
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

  scoring: scoringSchema.default({ winPoints: 3, lossPoints: 0, tiebreakers: [] }),
  finals: finalsSchema.optional(),

  memberChangeAllowed: z.boolean().default(false),
  maxMemberChanges: z.number().min(0).optional(),
})

export type SeriesConfig = z.infer<typeof seriesConfigSchema>

export function parseSeriesConfig(raw: unknown): SeriesConfig {
  return seriesConfigSchema.parse(raw)
}

export const WMGP_CONFIG: SeriesConfig = parseSeriesConfig({
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
      'totalRoundDiff',
      'roundMatchDiff',
      'duelDiff',
      'totalRoundScore',
      'headToHead',
    ],
  },
  finals: {
    format: 'single_elimination',
    qualifiedPerBlock: [1, '2or3'],
  },
  memberChangeAllowed: true,
  maxMemberChanges: 2,
})

export const ROCKET_CUP_CONFIG: SeriesConfig = parseSeriesConfig({
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
    tiebreakers: ['teamPoints', 'winPoints', 'headToHead'],
  },
  finals: {
    format: 'single_elimination',
    qualifiedCount: 4,
  },
  memberChangeAllowed: false,
})
