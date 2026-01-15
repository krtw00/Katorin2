import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SeriesRanking, PointSystem } from '@/types/series'

type Props = {
  rankings: SeriesRanking[]
  pointSystem: PointSystem
  showDetails?: boolean
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

export function SeriesRankingTable({ rankings, pointSystem, showDetails = false }: Props) {
  if (rankings.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        まだランキングデータがありません
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-center">順位</TableHead>
          <TableHead>名前</TableHead>
          <TableHead className="text-right">ポイント</TableHead>
          <TableHead className="text-right">参加大会</TableHead>
          {showDetails && (
            <>
              <TableHead className="text-right">勝利</TableHead>
              <TableHead className="text-right">敗北</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.map((ranking) => (
          <TableRow key={ranking.user_id || ranking.team_id}>
            <TableCell className="text-center font-medium">
              {getRankDisplay(ranking.rank)}
            </TableCell>
            <TableCell className="font-medium">{ranking.name}</TableCell>
            <TableCell className="text-right font-bold text-primary">
              {ranking.total_points}pt
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
