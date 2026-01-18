import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // リクエストからロケールを取得（ミドルウェアで設定される）
  let locale = await requestLocale

  // ロケールが無効な場合はデフォルトにフォールバック
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
