import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeriesWithOrganizer } from '@/types/series'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SeriesRankingPage({ params }: Props) {
  const t = await getTranslations('series')
  const tLabels = await getTranslations('labels')
  const { id } = await params
  const supabase = await createClient()

  // Fetch series
  const { data: series, error } = await supabase
    .from('series')
    .select(
      `
      *,
      organizer:profiles!series_organizer_id_fkey(*)
    `
    )
    .eq('id', id)
    .single() as { data: SeriesWithOrganizer | null; error: unknown }

  if (error || !series) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/series/${id}`}>
          <Button variant="ghost" className="mb-4">
            {t('detail.backToDetail')}
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{series.title}</h1>
          <Badge variant="outline">
            {tLabels('seriesStatus.' + series.status)}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{t('detail.ranking')}</p>
      </div>

      {/* Ranking - placeholder until Phase 3 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.overallRanking')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t('ranking.empty')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
