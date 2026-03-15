import { FileEdit, UserPlus, Play, CheckCircle, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status =
  | 'draft'
  | 'published'
  | 'registration'
  | 'recruiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

const STATUS_CONFIG: Record<Status, { icon: LucideIcon; color: string; dotColor: string }> = {
  draft: { icon: FileEdit, color: 'text-gray-400', dotColor: 'bg-gray-400' },
  published: { icon: FileEdit, color: 'text-yellow-500', dotColor: 'bg-yellow-500' },
  registration: { icon: UserPlus, color: 'text-blue-500', dotColor: 'bg-blue-500' },
  recruiting: { icon: UserPlus, color: 'text-blue-500', dotColor: 'bg-blue-500' },
  in_progress: { icon: Play, color: 'text-green-500', dotColor: 'bg-green-500' },
  completed: { icon: CheckCircle, color: 'text-gray-600', dotColor: 'bg-gray-600' },
  cancelled: { icon: XCircle, color: 'text-red-500', dotColor: 'bg-red-500' },
}

type StatusIndicatorProps = {
  status: string
  label?: string
  showIcon?: boolean
  showDot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function StatusIndicator({
  status,
  label,
  showIcon = true,
  showDot = false,
  size = 'sm',
  className,
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.draft
  const Icon = config.icon
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <span className={cn('inline-flex items-center gap-1', config.color, className)}>
      {showDot && (
        <span className={cn('rounded-full', config.dotColor, size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
      )}
      {showIcon && <Icon className={iconSize} />}
      {label && <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm')}>{label}</span>}
    </span>
  )
}
