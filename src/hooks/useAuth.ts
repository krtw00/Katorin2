'use client'

import { useAuthContext } from '@/providers/AuthProvider'

/**
 * 認証状態を取得するフック。
 * AuthProvider 内で状態を共有するため、複数コンポーネントから呼んでもAPI呼び出しは1回。
 */
export function useAuth() {
  return useAuthContext()
}
