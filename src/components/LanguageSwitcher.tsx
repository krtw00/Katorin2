'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
      aria-label={t('select')}
      title={t('select')}
    >
      <Globe className="h-4 w-4" />
      <Link
        href={pathname}
        locale="ja"
        className={cn(
          'rounded px-1.5 py-0.5 transition-colors',
          locale === 'ja'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('ja')}
      </Link>
      <span className="text-muted-foreground">/</span>
      <Link
        href={pathname}
        locale="en"
        className={cn(
          'rounded px-1.5 py-0.5 transition-colors',
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('en')}
      </Link>
    </div>
  )
}
