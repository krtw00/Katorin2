import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const locales = ['ja', 'en'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  // サポートするロケール
  locales,

  // デフォルトロケール
  defaultLocale: 'ja',

  // デフォルトロケールではURLプレフィックスを省略
  // /about (日本語), /en/about (英語)
  localePrefix: 'as-needed',
})

// next-intl用のナビゲーションヘルパー
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
