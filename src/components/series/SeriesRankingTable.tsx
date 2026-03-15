// TODO: Phase 3 で再実装予定（series_rankings ビュー削除済み）
// 現在は未使用コンポーネント

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslations } from 'next-intl'

type RankingEntry = {
  rank: number | null
  user_id: string | null
  team_id: string | null
  name: string | null
  total_points: number | null
  tournaments_played: number | null
  total_wins: number | null
  total_losses: number | null
}

type Props = {
  rankings: RankingEntry[]
  pointSystem?: string
  showDetails?: boolean
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

export function SeriesRankingTable({ rankings, showDetails = false }: Props) {
  const t = useTranslations('series.ranking')

  if (rankings.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t('empty')}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-center">{t('rank')}</TableHead>
          <TableHead>{t('name')}</TableHead>
          <TableHead className="text-right">{t('points')}</TableHead>
          <TableHead className="text-right">{t('tournamentsPlayed')}</TableHead>
          {showDetails && (
            <>
              <TableHead className="text-right">{t('wins')}</TableHead>
              <TableHead className="text-right">{t('losses')}</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.map((ranking) => (
          <TableRow key={ranking.user_id || ranking.team_id}>
            <TableCell className="text-center font-medium">
              {getRankDisplay(ranking.rank ?? 0)}
            </TableCell>
            <TableCell className="font-medium">{ranking.name}</TableCell>
            <TableCell className="text-right font-bold text-primary">
              {ranking.total_points}{t('pointsUnit')}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {ranking.tournaments_played}
            </TableCell>
            {showDetails && (
              <>
                <TableCell className="text-right text-green-600">
                  {ranking.total_wins}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {ranking.total_losses}
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
