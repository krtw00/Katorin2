'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { MatchWithPlayers } from '@/types/tournament'
import { reportMatchResult, type MatchReport } from '@/app/[locale]/(main)/tournaments/[id]/actions'

type Props = {
  match: MatchWithPlayers | null
  open: boolean
  onClose: () => void
  currentUserId: string
}

export function MatchReportDialog({ match, open, onClose, currentUserId }: Props) {
  const t = useTranslations('tournament.report')
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const isPlayer1 = match?.player1_id === currentUserId
  const isPlayer2 = match?.player2_id === currentUserId

  // 既存の報告を表示
  const myReport = match
    ? (isPlayer1 ? match.player1_report : match.player2_report) as MatchReport | null
    : null
  const opponentReport = match
    ? (isPlayer1 ? match.player2_report : match.player1_report) as MatchReport | null
    : null

  useEffect(() => {
    if (match) {
      if (myReport) {
        setPlayer1Score(myReport.player1_score)
        setPlayer2Score(myReport.player2_score)
      } else {
        setPlayer1Score(0)
        setPlayer2Score(0)
      }
      setError('')
      setResultMessage('')
    }
  }, [match, myReport])

  if (!match) return null

  const hasReported = !!myReport
  const isDisputed = match.report_status === 'disputed'

  const handleSubmit = async () => {
    if (player1Score === player2Score) {
      setError(t('tieError'))
      return
    }

    if (!match.player1_id || !match.player2_id) {
      setError(t('playerNotConfirmed'))
      return
    }

    setSubmitting(true)
    setError('')
    setResultMessage('')

    const winnerId = player1Score > player2Score ? match.player1_id : match.player2_id
    const result = await reportMatchResult(match.id, {
      winner_id: winnerId,
      player1_score: player1Score,
      player2_score: player2Score,
    })

    setSubmitting(false)

    if (!result.success) {
      setError(result.error || t('submitFailed'))
      return
    }

    if (result.status === 'agreed') {
      setResultMessage(t('confirmed'))
    } else if (result.status === 'disputed') {
      setResultMessage(t('disputed'))
    } else {
      setResultMessage(t('pending'))
    }

    setTimeout(() => {
      onClose()
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            R{match.round}-{match.match_number}
            {match.report_status && (
              <Badge
                variant={
                  match.report_status === 'agreed' ? 'default'
                    : match.report_status === 'disputed' ? 'destructive'
                    : 'secondary'
                }
                className="ml-2"
              >
                {match.report_status === 'agreed' ? t('statusConfirmed')
                  : match.report_status === 'disputed' ? t('statusDisputed')
                  : match.report_status === 'pending' ? t('statusPending')
                  : match.report_status}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {resultMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded text-sm">
              {resultMessage}
            </div>
          )}

          {isDisputed && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-3 py-2 rounded text-sm">
              {t('disputeNotice')}
            </div>
          )}

          {/* 相手の報告状況 */}
          {opponentReport && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              {t('opponentReported')}
            </div>
          )}

          {/* Player 1 */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">
                {match.player1?.display_name || 'Player 1'}
                {isPlayer1 && <span className="text-xs text-primary ml-1">{t('you')}</span>}
              </label>
            </div>
            <Input
              type="number"
              min="0"
              max="99"
              value={player1Score}
              onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
              className="w-20 text-center text-lg font-bold"
              disabled={submitting || !!resultMessage}
            />
          </div>

          <div className="text-center text-muted-foreground text-sm">vs</div>

          {/* Player 2 */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">
                {match.player2?.display_name || 'Player 2'}
                {isPlayer2 && <span className="text-xs text-primary ml-1">{t('you')}</span>}
              </label>
            </div>
            <Input
              type="number"
              min="0"
              max="99"
              value={player2Score}
              onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
              className="w-20 text-center text-lg font-bold"
              disabled={submitting || !!resultMessage}
            />
          </div>

          {/* Winner preview */}
          {player1Score !== player2Score && (
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-sm text-green-700 dark:text-green-300">
                {t('winner')} {player1Score > player2Score
                  ? match.player1?.display_name
                  : match.player2?.display_name}
              </span>
            </div>
          )}

          {hasReported && !resultMessage && (
            <p className="text-xs text-muted-foreground">
              {t('alreadyReported')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('close')}
          </Button>
          {!resultMessage && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || player1Score === player2Score}
            >
              {submitting ? t('submitting') : hasReported ? t('reReport') : t('submit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
