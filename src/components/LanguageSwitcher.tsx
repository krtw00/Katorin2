'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { locales, type Locale } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = () => {
    // 現在のロケールと異なるロケールに切り替え
    const newLocale = locale === 'ja' ? 'en' : 'ja'
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLocaleChange}
      title={t('select')}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      <span>{t(locale as Locale)}</span>
    </Button>
  )
}
