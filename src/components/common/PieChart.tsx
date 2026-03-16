'use client'

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
]

type PieChartProps = {
  data: { label: string; value: number }[]
  size?: number
  className?: string
}

export function PieChart({ data, size = 200, className }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  const center = size / 2
  const radius = size / 2 - 4
  const innerRadius = radius * 0.55

  let currentAngle = -Math.PI / 2 // 12時スタート

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * Math.PI * 2
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const largeArc = angle > Math.PI ? 1 : 0

    const x1 = center + radius * Math.cos(startAngle)
    const y1 = center + radius * Math.sin(startAngle)
    const x2 = center + radius * Math.cos(endAngle)
    const y2 = center + radius * Math.sin(endAngle)
    const ix1 = center + innerRadius * Math.cos(startAngle)
    const iy1 = center + innerRadius * Math.sin(startAngle)
    const ix2 = center + innerRadius * Math.cos(endAngle)
    const iy2 = center + innerRadius * Math.sin(endAngle)

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ')

    return { path, color: COLORS[i % COLORS.length], label: d.label, value: d.value, rate: Math.round((d.value / total) * 1000) / 10 }
  })

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} className="transition-opacity hover:opacity-80" />
          ))}
          <text x={center} y={center - 6} textAnchor="middle" className="fill-foreground text-2xl font-bold" fontSize="24">
            {total}
          </text>
          <text x={center} y={center + 14} textAnchor="middle" className="fill-muted-foreground text-xs" fontSize="12">
            件
          </text>
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate max-w-[120px]">{s.label}</span>
              <span className="text-muted-foreground tabular-nums text-xs">{s.rate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
