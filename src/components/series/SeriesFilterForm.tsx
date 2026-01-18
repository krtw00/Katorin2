'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

type FilterStatus = 'all' | 'active' | 'completed'

export function SeriesFilterForm() {
  const t = useTranslations('series')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: t('status.all') },
    { value: 'active', label: t('status.active') },
    { value: 'completed', label: t('status.completed') },
  ]

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(
    (searchParams.get('status') as FilterStatus) || 'all'
  )

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, statusFilter])

  const updateURL = () => {
    const params = new URLSearchParams()

    if (query) {
      params.set('q', query)
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }

    startTransition(() => {
      router.push(`/series${params.toString() ? `?${params.toString()}` : ''}`, {
        scroll: false,
      })
    })
  }

  const handleStatusChange = (status: FilterStatus) => {
    setStatusFilter(status)
  }

  return (
    <div className="space-y-4">
      {/* 検索ボックス */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('filter.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ステータスフィルター */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((option) => (
          <Badge
            key={option.value}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/80 px-3 py-1 transition-colors"
            onClick={() => handleStatusChange(option.value)}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      {/* ローディングインジケーター */}
      {isPending && (
        <div className="text-sm text-muted-foreground">
          {t('filter.filtering')}
        </div>
      )}
    </div>
  )
}
