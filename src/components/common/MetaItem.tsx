import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type MetaItemProps = {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

export function MetaItem({ icon: Icon, children, className }: MetaItemProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  )
}
