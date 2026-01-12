'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { matchStatusLabels, MatchWithPlayers } from '@/types/tournament'
import { useRealtimeMatches } from '@/hooks/useRealtimeMatches'

type Props = {
  tournamentId: string
  initialMatches: MatchWithPlayers[]
}

type MatchPosition = {
  id: string
  round: number
  matchNumber: number
  x: number
  y: number
  width: number
  height: number
  nextMatchId: string | null
}

function MatchCard({
  match,
  onPositionChange
}: {
  match: MatchWithPlayers
  onPositionChange: (id: string, rect: DOMRect) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isCompleted = match.status === 'completed'
  const isInProgress = match.status === 'in_progress'

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const parentRect = ref.current.offsetParent?.getBoundingClientRect()
      if (parentRect) {
        onPositionChange(match.id, new DOMRect(
          ref.current.offsetLeft,
          ref.current.offsetTop,
          rect.width,
          rect.height
        ))
      }
    }
  }, [match.id, onPositionChange])

  const PlayerRow = ({
    player,
    playerId,
    score,
    isWinner,
  }: {
    player: { display_name: string } | null
    playerId: string | null
    score: number
    isWinner: boolean
  }) => (
    <div
      className={`
        flex items-center justify-between px-2 py-1.5
        ${isWinner ? 'bg-green-100 dark:bg-green-900/50' : ''}
      `}
    >
      <span
        className={`
          truncate flex-1 mr-2 text-sm
          ${isWinner ? 'font-bold text-green-700 dark:text-green-300' : ''}
          ${!player ? 'text-muted-foreground italic' : ''}
        `}
      >
        {player?.display_name || 'TBD'}
      </span>
      <span
        className={`
          font-mono text-sm min-w-[1.5rem] text-right
          ${isWinner ? 'font-bold' : 'text-muted-foreground'}
        `}
      >
        {playerId ? score : '-'}
      </span>
    </div>
  )

  return (
    <div
      ref={ref}
      className={`
        border rounded-md bg-card shadow-sm overflow-hidden
        ${isInProgress ? 'ring-2 ring-primary' : ''}
        ${isCompleted ? 'border-muted' : 'border-border'}
      `}
      style={{ width: '160px' }}
    >
      <PlayerRow
        player={match.player1}
        playerId={match.player1_id}
        score={match.player1_score}
        isWinner={match.winner_id === match.player1_id && !!match.winner_id}
      />
      <div className="border-t" />
      <PlayerRow
        player={match.player2}
        playerId={match.player2_id}
        score={match.player2_score}
        isWinner={match.winner_id === match.player2_id && !!match.winner_id}
      />
      <div
        className={`
          text-center text-xs py-0.5
          ${isCompleted ? 'bg-muted text-muted-foreground' : ''}
          ${isInProgress ? 'bg-primary text-primary-foreground' : ''}
          ${!isCompleted && !isInProgress ? 'bg-muted/50 text-muted-foreground' : ''}
        `}
      >
        {matchStatusLabels[match.status]}
      </div>
    </div>
  )
}

function ConnectorLines({
  positions,
  matches
}: {
  positions: Map<string, MatchPosition>
  matches: MatchWithPlayers[]
}) {
  const lines: JSX.Element[] = []

  matches.forEach((match) => {
    if (!match.next_match_id) return

    const fromPos = positions.get(match.id)
    const toPos = positions.get(match.next_match_id)

    if (!fromPos || !toPos) return

    const fromX = fromPos.x + fromPos.width
    const fromY = fromPos.y + fromPos.height / 2
    const toX = toPos.x
    const toY = toPos.y + toPos.height / 2
    const midX = fromX + (toX - fromX) / 2

    lines.push(
      <path
        key={match.id}
        d={`M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/40"
      />
    )
  })

  return <>{lines}</>
}

export function RealtimeBracket({ tournamentId, initialMatches }: Props) {
  const matches = useRealtimeMatches(tournamentId, initialMatches)
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<string, MatchPosition>>(new Map())
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Group matches by round
  const matchesByRound = new Map<number, MatchWithPlayers[]>()
  matches.forEach((match) => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, [])
    }
    matchesByRound.get(match.round)?.push(match)
  })

  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b)
  const maxRound = Math.max(...rounds, 0)

  const getRoundLabel = (round: number) => {
    if (round === maxRound) return '決勝'
    if (round === maxRound - 1 && maxRound >= 2) return '準決勝'
    if (round === maxRound - 2 && maxRound >= 3) return '準々決勝'
    return `${round}回戦`
  }

  const handlePositionChange = useCallback((id: string, rect: DOMRect) => {
    setPositions(prev => {
      const match = matches.find(m => m.id === id)
      if (!match) return prev

      const newMap = new Map(prev)
      newMap.set(id, {
        id,
        round: match.round,
        matchNumber: match.match_number,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        nextMatchId: match.next_match_id,
      })
      return newMap
    })
  }, [matches])

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.scrollWidth,
            height: containerRef.current.scrollHeight,
          })
        }
      }
      updateSize()
      const observer = new ResizeObserver(updateSize)
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [matches])

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          トーナメント表はまだ生成されていません
        </p>
      </div>
    )
  }

  const CARD_WIDTH = 160
  const CARD_HEIGHT = 76
  const ROUND_GAP = 80
  const HEADER_HEIGHT = 32

  return (
    <div className="overflow-auto">
      <div
        ref={containerRef}
        className="relative p-4"
        style={{
          minWidth: `${rounds.length * (CARD_WIDTH + ROUND_GAP) + CARD_WIDTH + 100}px`,
          minHeight: `${Math.pow(2, rounds.length - 1) * (CARD_HEIGHT + 16) + HEADER_HEIGHT + 100}px`
        }}
      >
        {/* SVG for connector lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: containerSize.width || '100%',
            height: containerSize.height || '100%'
          }}
        >
          <ConnectorLines positions={positions} matches={matches} />
        </svg>

        {/* Bracket content */}
        <div className="flex gap-20">
          {rounds.map((round, roundIndex) => {
            const roundMatches = matchesByRound.get(round) || []
            const matchCount = roundMatches.length
            const totalHeight = Math.pow(2, rounds.length - 1) * (CARD_HEIGHT + 16)
            const spacing = totalHeight / matchCount

            return (
              <div key={round} className="flex flex-col" style={{ width: CARD_WIDTH }}>
                {/* Round header */}
                <div className="text-center mb-4 h-8">
                  <span className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
                    {getRoundLabel(round)}
                  </span>
                </div>

                {/* Matches */}
                <div
                  className="flex flex-col"
                  style={{
                    gap: `${spacing - CARD_HEIGHT}px`,
                    paddingTop: `${(spacing - CARD_HEIGHT) / 2}px`
                  }}
                >
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onPositionChange={handlePositionChange}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Winner column */}
          {maxRound > 0 && (
            <div className="flex flex-col" style={{ width: CARD_WIDTH }}>
              <div className="text-center mb-4 h-8">
                <span className="text-sm font-medium px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full">
                  優勝
                </span>
              </div>

              <div
                className="flex flex-col"
                style={{
                  paddingTop: `${(Math.pow(2, rounds.length - 1) * (CARD_HEIGHT + 16) - CARD_HEIGHT) / 2}px`
                }}
              >
                {(() => {
                  const finalMatch = matchesByRound.get(maxRound)?.[0]
                  const winner = finalMatch?.winner
                  return (
                    <div
                      className={`
                        rounded-md border-2 px-3 py-4 text-center
                        ${winner
                          ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30'
                          : 'border-dashed border-muted-foreground/30 bg-muted/20'
                        }
                      `}
                      style={{ width: CARD_WIDTH }}
                    >
                      {winner ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">🏆</span>
                          <span className="font-bold text-base">
                            {winner.display_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          未確定
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-8 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>対戦中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>勝者</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span>終了</span>
          </div>
        </div>
      </div>
    </div>
  )
}
