import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string; roundId: string }> }

export default async function LeagueRoundManagePage({ params }: Props) {
  const { roundId } = await params
  redirect(`/tournaments/${roundId}/manage`)
}
