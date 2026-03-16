import { TournamentError, ErrorCode, errorMessageKeys } from './TournamentError'

// Fallback message for logging (not displayed to users - UI uses i18n keys)
function fallbackMessage(code: ErrorCode): string {
  return errorMessageKeys[code] || 'unknownError'
}
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Supabaseエラーを TournamentError に変換
 */
export function handleSupabaseError(error: PostgrestError): TournamentError {
  // エラーコードに基づいて適切な TournamentError を返す
  switch (error.code) {
    case '23505':
      // Unique constraint violation
      return new TournamentError(
        ErrorCode.DUPLICATE_ENTRY,
        fallbackMessage(ErrorCode.DUPLICATE_ENTRY),
        error
      )

    case '23503':
      // Foreign key constraint violation
      return new TournamentError(
        ErrorCode.NOT_FOUND,
        'relatedNotFound',
        error
      )

    case '42501':
      // Insufficient privilege (RLS policy violation)
      return new TournamentError(
        ErrorCode.FORBIDDEN,
        fallbackMessage(ErrorCode.FORBIDDEN),
        error
      )

    case 'PGRST116':
      // Not found (no rows returned)
      return new TournamentError(
        ErrorCode.NOT_FOUND,
        fallbackMessage(ErrorCode.NOT_FOUND),
        error
      )

    case '22P02':
      // Invalid input syntax
      return new TournamentError(
        ErrorCode.INVALID_INPUT,
        fallbackMessage(ErrorCode.INVALID_INPUT),
        error
      )

    default:
      // その他のデータベースエラー
      return new TournamentError(
        ErrorCode.DATABASE_ERROR,
        error.message || fallbackMessage(ErrorCode.DATABASE_ERROR),
        error
      )
  }
}

/**
 * 汎用エラーハンドリング関数
 * あらゆるエラーを TournamentError に統一
 */
export function handleError(error: unknown): TournamentError {
  // すでに TournamentError の場合はそのまま返す
  if (error instanceof TournamentError) {
    return error
  }

  // Supabase PostgrestError の場合
  if (isPostgrestError(error)) {
    return handleSupabaseError(error)
  }

  // ネットワークエラー
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new TournamentError(
      ErrorCode.NETWORK_ERROR,
      fallbackMessage(ErrorCode.NETWORK_ERROR),
      error
    )
  }

  // 一般的なErrorオブジェクト
  if (error instanceof Error) {
    return new TournamentError(
      ErrorCode.UNKNOWN_ERROR,
      error.message || fallbackMessage(ErrorCode.UNKNOWN_ERROR),
      error
    )
  }

  // その他の予期しないエラー
  return new TournamentError(
    ErrorCode.UNKNOWN_ERROR,
    fallbackMessage(ErrorCode.UNKNOWN_ERROR),
    error
  )
}

/**
 * PostgrestError の型ガード
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  )
}

/**
 * バリデーションエラーを生成するヘルパー関数
 */
export function createValidationError(message: string, details?: unknown): TournamentError {
  return new TournamentError(ErrorCode.VALIDATION_ERROR, message, details)
}

/**
 * 認証エラーを生成するヘルパー関数
 */
export function createUnauthorizedError(message?: string): TournamentError {
  return new TournamentError(
    ErrorCode.UNAUTHORIZED,
    message || fallbackMessage(ErrorCode.UNAUTHORIZED)
  )
}

/**
 * 権限エラーを生成するヘルパー関数
 */
export function createForbiddenError(message?: string): TournamentError {
  return new TournamentError(
    ErrorCode.FORBIDDEN,
    message || fallbackMessage(ErrorCode.FORBIDDEN)
  )
}

/**
 * Not Foundエラーを生成するヘルパー関数
 */
export function createNotFoundError(resource: string): TournamentError {
  return new TournamentError(
    ErrorCode.NOT_FOUND,
    `${resource} not found`
  )
}
