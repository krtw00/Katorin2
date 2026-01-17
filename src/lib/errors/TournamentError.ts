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
 * エラーメッセージの国際化（日本語）
 */
export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'ログインが必要です',
  [ErrorCode.FORBIDDEN]: 'この操作を実行する権限がありません',
  [ErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります',
  [ErrorCode.INVALID_INPUT]: '無効な入力です',
  [ErrorCode.DATABASE_ERROR]: 'データベースエラーが発生しました',
  [ErrorCode.NOT_FOUND]: 'データが見つかりません',
  [ErrorCode.DUPLICATE_ENTRY]: 'すでに登録されています',
  [ErrorCode.TOURNAMENT_FULL]: '大会の定員に達しています',
  [ErrorCode.BRACKET_ALREADY_GENERATED]: 'ブラケットは既に生成されています',
  [ErrorCode.INSUFFICIENT_PARTICIPANTS]: '参加者が不足しています（最低2名必要）',
  [ErrorCode.INVALID_TOURNAMENT_STATUS]: '現在の大会状態ではこの操作を実行できません',
  [ErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
}

/**
 * エラーコードに対応するユーザーメッセージを取得
 */
export function getErrorMessage(code: ErrorCode): string {
  return errorMessages[code] || errorMessages[ErrorCode.UNKNOWN_ERROR]
}
