/**
 * Supabase レスポンス型定義
 * 型安全なデータ取得のためのヘルパー型とユーティリティ関数
 */

import { PostgrestError } from '@supabase/supabase-js'
import { handleSupabaseError } from '@/lib/errors/handleError'
import { TournamentError } from '@/lib/errors/TournamentError'

/**
 * Supabase 単一レコードレスポンスの統一型
 */
export interface SupabaseResponse<T> {
  data: T | null
  error: PostgrestError | null
}

/**
 * Supabase 配列レスポンスの統一型
 */
export interface SupabaseArrayResponse<T> {
  data: T[] | null
  error: PostgrestError | null
}

/**
 * 型安全な Supabase single() ヘルパー
 *
 * 使用例:
 * ```ts
 * const result = await safeSupabaseSingle<Tournament>(
 *   supabase.from('tournaments').select('*').eq('id', id).single()
 * )
 * ```
 */
export async function safeSupabaseSingle<T>(
  query: PromiseLike<{ data: unknown; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await query

  if (error) {
    throw handleSupabaseError(error)
  }

  if (!data) {
    throw handleSupabaseError({
      code: 'PGRST116',
      message: 'Not found',
      details: '',
      hint: '',
    } as PostgrestError)
  }

  return data as T
}

/**
 * 型安全な Supabase 配列クエリヘルパー
 *
 * 使用例:
 * ```ts
 * const tournaments = await safeSupabaseArray<Tournament>(
 *   supabase.from('tournaments').select('*')
 * )
 * ```
 */
export async function safeSupabaseArray<T>(
  query: PromiseLike<{ data: unknown; error: PostgrestError | null }>
): Promise<T[]> {
  const { data, error } = await query

  if (error) {
    throw handleSupabaseError(error)
  }

  if (!data) {
    return []
  }

  return data as T[]
}

/**
 * 型安全な Supabase insert/update/delete ヘルパー
 *
 * 使用例:
 * ```ts
 * const tournament = await safeSupabaseMutation<Tournament>(
 *   supabase.from('tournaments').insert(data).select().single()
 * )
 * ```
 */
export async function safeSupabaseMutation<T>(
  query: PromiseLike<{ data: unknown; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await query

  if (error) {
    throw handleSupabaseError(error)
  }

  if (!data) {
    throw new Error('Mutation returned no data')
  }

  return data as T
}

/**
 * エラーハンドリング付きの try-catch ラッパー
 *
 * 使用例:
 * ```ts
 * const tournament = await withErrorHandling(async () => {
 *   return await safeSupabaseSingle<Tournament>(
 *     supabase.from('tournaments').select('*').eq('id', id).single()
 *   )
 * })
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => PromiseLike<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof TournamentError) {
      throw error
    }
    throw handleSupabaseError(error as PostgrestError)
  }
}

/**
 * オプショナルデータ取得ヘルパー（エラーを返さず null を返す）
 *
 * 使用例:
 * ```ts
 * const tournament = await safeSupabaseOptional<Tournament>(
 *   supabase.from('tournaments').select('*').eq('id', id).single()
 * )
 * // tournament は Tournament | null
 * ```
 */
export async function safeSupabaseOptional<T>(
  query: PromiseLike<{ data: unknown; error: PostgrestError | null }>
): Promise<T | null> {
  try {
    return await safeSupabaseSingle<T>(query)
  } catch {
    return null
  }
}
