'use client'

import { useState, useCallback } from 'react'

const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB

export interface ImageUploadError {
  message: string
}

/**
 * 画像アップロードのフック
 */
export function useImageUpload(initialPreview?: string | null) {
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialPreview || null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)

  /**
   * 画像ファイルのバリデーション
   */
  const validateImageFile = useCallback((file: File): ImageUploadError | null => {
    // ファイルサイズチェック
    if (file.size > MAX_IMAGE_SIZE) {
      return { message: '画像サイズは3MB以下にしてください' }
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      return { message: '画像ファイルを選択してください' }
    }

    return null
  }, [])

  /**
   * 画像ファイルをプレビュー用のData URLに変換
   */
  const convertToPreviewURL = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onloadend = () => {
          resolve(reader.result as string)
        }

        reader.onerror = () => {
          reject(new Error('画像の読み込みに失敗しました'))
        }

        reader.readAsDataURL(file)
      })
    },
    []
  )

  /**
   * 画像ファイル変更ハンドラー
   */
  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null)

      const file = e.target.files?.[0]
      if (!file) {
        return
      }

      // バリデーション
      const validationError = validateImageFile(file)
      if (validationError) {
        setUploadError(validationError.message)
        return
      }

      try {
        // プレビュー生成
        const previewURL = await convertToPreviewURL(file)
        setCoverPreview(previewURL)
      } catch (error) {
        setUploadError('画像の読み込みに失敗しました')
      }
    },
    [validateImageFile, convertToPreviewURL]
  )

  /**
   * プレビューをクリア
   */
  const clearPreview = useCallback(() => {
    setCoverPreview(null)
    setUploadError(null)
  }, [])

  /**
   * プレビューを直接設定（URL文字列）
   */
  const setPreviewURL = useCallback((url: string | null) => {
    setCoverPreview(url)
    setUploadError(null)
  }, [])

  return {
    coverPreview,
    uploadError,
    handleImageChange,
    clearPreview,
    setPreviewURL,
  }
}
