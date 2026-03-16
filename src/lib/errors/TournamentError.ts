/**
 * トーナメント管理アプリケーションのエラーコード定義
 */
export enum ErrorCode {
  // 認証エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // バリデーションエラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // データベースエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // ビジネスロジックエラー
  TOURNAMENT_FULL = 'TOURNAMENT_FULL',
  BRACKET_ALREADY_GENERATED = 'BRACKET_ALREADY_GENERATED',
  INSUFFICIENT_PARTICIPANTS = 'INSUFFICIENT_PARTICIPANTS',
  INVALID_TOURNAMENT_STATUS = 'INVALID_TOURNAMENT_STATUS',

  // システムエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * カスタムエラークラス
 * アプリケーション全体で統一されたエラーハンドリングを提供
 */
export class TournamentError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'TournamentError'

    // スタックトレースを正しく保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TournamentError)
    }
  }

  /**
   * エラーコードに基づいてHTTPステータスコードを返す
   */
  getHttpStatus(): number {
    switch (this.code) {
      case ErrorCode.UNAUTHORIZED:
        return 401
      case ErrorCode.FORBIDDEN:
        return 403
      case ErrorCode.NOT_FOUND:
        return 404
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
      case ErrorCode.TOURNAMENT_FULL:
      case ErrorCode.BRACKET_ALREADY_GENERATED:
      case ErrorCode.INSUFFICIENT_PARTICIPANTS:
      case ErrorCode.INVALID_TOURNAMENT_STATUS:
      case ErrorCode.DUPLICATE_ENTRY:
        return 400
      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.UNKNOWN_ERROR:
      default:
        return 500
    }
  }

  /**
   * ユーザーに表示可能な形式でエラーを返す
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.getHttpStatus(),
      ...(process.env.NODE_ENV === 'development' && { details: this.details }),
    }
  }
}

/**
 * エラーコードからi18nキー名へのマッピング
 * 表示側で t(errorMessageKeys[code]) として使用する
 */
export const errorMessageKeys: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'unauthorized',
  [ErrorCode.FORBIDDEN]: 'forbidden',
  [ErrorCode.VALIDATION_ERROR]: 'validationError',
  [ErrorCode.INVALID_INPUT]: 'invalidInput',
  [ErrorCode.DATABASE_ERROR]: 'databaseError',
  [ErrorCode.NOT_FOUND]: 'notFound',
  [ErrorCode.DUPLICATE_ENTRY]: 'duplicateEntry',
  [ErrorCode.TOURNAMENT_FULL]: 'tournamentFull',
  [ErrorCode.BRACKET_ALREADY_GENERATED]: 'bracketAlreadyGenerated',
  [ErrorCode.INSUFFICIENT_PARTICIPANTS]: 'insufficientParticipants',
  [ErrorCode.INVALID_TOURNAMENT_STATUS]: 'invalidTournamentStatus',
  [ErrorCode.NETWORK_ERROR]: 'networkError',
  [ErrorCode.UNKNOWN_ERROR]: 'unknownError',
}
