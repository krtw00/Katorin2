'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type ActionType =
  | 'next_match'      // 次の試合がある
  | 'result_pending'  // 結果入力待ち
  | 'bracket_ready'   // ブラケット生成可能
  | 'entry_open'      // エントリー受付中（主催者向け）

type ActionCardProps = {
  type: ActionType
  tournamentId: string
  tournamentTitle: string
  description: string
  actionLabel: string
  actionHref: string
}

const actionConfig: Record<ActionType, { icon: string; bgClass: string }> = {
  next_match: {
    icon: '⚡',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
  },
  result_pending: {
    icon: '📝',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  },
  bracket_ready: {
    icon: '🎯',
    bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
  },
  entry_open: {
    icon: '📢',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
  },
}

export function ActionCard({
  type,
  tournamentId,
  tournamentTitle,
  description,
  actionLabel,
  actionHref,
}: ActionCardProps) {
  const config = actionConfig[type]

  return (
    <Card className={`${config.bgClass} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <Link
              href={`/tournaments/${tournamentId}`}
              className="font-medium text-sm hover:underline truncate block"
            >
              {tournamentTitle}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          </div>
          <Link href={actionHref}>
            <Button size="sm" variant="secondary">
              {actionLabel}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// Empty state when no actions needed
export function NoActionsCard() {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-6 text-center">
        <span className="text-3xl">✨</span>
        <p className="text-sm text-muted-foreground mt-2">
          対応が必要な項目はありません
        </p>
      </CardContent>
    </Card>
  )
}
