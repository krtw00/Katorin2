import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string; roundId: string }> }

export default async function LeagueRoundPage({ params }: Props) {
  const { roundId } = await params
  redirect(`/tournaments/${roundId}`)
}
