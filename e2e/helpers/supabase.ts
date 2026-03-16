import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** ユーザーを作成（既存なら再利用） */
export async function createTestUser(
  email: string,
  displayName: string
): Promise<string> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test1234',
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (error?.message?.includes('already been registered')) {
    // ページネーションで全ページ検索
    for (let page = 1; page <= 20; page++) {
      const { data: listData } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 50,
      })
      if (!listData?.users?.length) break
      const existing = listData.users.find((u) => u.email === email)
      if (existing) return existing.id
    }
    throw new Error(`User ${email} exists but not found in any page`)
  }

  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`)
  return data.user.id
}

export async function deleteTestUsers(emailPattern: string) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await adminClient.auth.admin.listUsers({ page, perPage: 50 })
    if (!data?.users?.length) break
    const targets = data.users.filter((u) => u.email?.includes(emailPattern))
    for (const u of targets) {
      await adminClient.auth.admin.deleteUser(u.id)
    }
    if (data.users.length < 50) break
  }
}

/** テストデータのクリーンアップ */
export async function cleanupTestData(prefix: string) {
  await adminClient.from('series').delete().ilike('title', `${prefix}%`)
  await adminClient.from('tournaments').delete().ilike('title', `${prefix}%`)
  await adminClient.from('teams').delete().ilike('name', `${prefix}%`)
}
