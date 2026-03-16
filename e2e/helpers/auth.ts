import { type Page } from '@playwright/test'

/** ブラウザ上でSupabase認証ログインを行う */
export async function loginAs(page: Page, email: string, password = 'test1234') {
  await page.goto('/ja/login', { waitUntil: 'networkidle' })
  await page.waitForSelector('input#email', { timeout: 30_000 })
  await page.fill('input#email', email)
  await page.fill('input#password', password)
  await page.click('button[type="submit"]')
  // ログイン成功後: /tournaments にリダイレクトされるがlocaleの問題で404の場合あり
  // URLが変わるか、ログインフォームが消えるまで待機
  await page.waitForFunction(
    () => !document.querySelector('input#email'),
    { timeout: 15_000 }
  )
}
