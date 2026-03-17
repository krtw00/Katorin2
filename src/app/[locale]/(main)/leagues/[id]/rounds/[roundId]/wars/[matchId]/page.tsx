import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string; roundId: string; matchId: string }> }

export default async function LeagueRoundWarDetailPage({ params }: Props) {
  const { roundId, matchId } = await params
  redirect(`/tournaments/${roundId}/wars/${matchId}`)
}
