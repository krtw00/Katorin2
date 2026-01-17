'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TournamentError, ErrorCode, errorMessages } from '@/lib/errors/TournamentError'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // エラーログを出力（本番環境では外部サービスに送信）
    console.error('Error boundary caught:', error)

    // TODO: 本番環境では Sentry 等のエラー追跡サービスに送信
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error)
    // }
  }, [error])

  const isTournamentError = error instanceof TournamentError
  const errorMessage = isTournamentError
    ? errorMessages[error.code]
    : 'エラーが発生しました'

  const errorCode = isTournamentError ? error.code : ErrorCode.UNKNOWN_ERROR
  const isServerError =
    errorCode === ErrorCode.DATABASE_ERROR ||
    errorCode === ErrorCode.NETWORK_ERROR ||
    errorCode === ErrorCode.UNKNOWN_ERROR

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md w-full space-y-6">
        {/* エラーアイコンとタイトル */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              エラーが発生しました
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
        </div>

        {/* エラーコード（本番環境でも表示） */}
        {isTournamentError && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              エラーコード: {error.code}
            </p>
          </div>
        )}

        {/* 詳細情報（開発モードのみ） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-muted rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-medium mb-2">
              詳細情報（開発モードのみ）
            </summary>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">エラーメッセージ:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">スタックトレース:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
              {isTournamentError && error.details && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">詳細:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* アクションボタン */}
        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            再試行
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/tournaments')}
            className="w-full"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            トップページに戻る
          </Button>
        </div>

        {/* サポート情報 */}
        {isServerError && (
          <div className="text-center text-sm text-muted-foreground">
            <p>問題が解決しない場合は、サポートにお問い合わせください。</p>
            {error.digest && (
              <p className="text-xs mt-2">
                エラーID: <code className="bg-muted px-1 py-0.5 rounded">{error.digest}</code>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
