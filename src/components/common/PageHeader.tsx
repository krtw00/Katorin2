import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 mb-6', className)}>
      <h1 className="text-xl font-bold sm:text-2xl truncate">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
