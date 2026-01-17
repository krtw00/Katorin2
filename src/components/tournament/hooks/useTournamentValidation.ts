'use client'

import { useMemo, useCallback } from 'react'
import { TournamentFormData } from './useTournamentFormState'
import { CustomField } from '@/types/tournament'
import { createValidationError } from '@/lib/errors/handleError'

export interface ValidationError {
  field: string
  message: string
}

/**
 * トーナメントフォームのバリデーションフック
 */
export function useTournamentValidation(
  formData: TournamentFormData,
  customFields: CustomField[]
) {
  /**
   * 全てのバリデーションを実行
   */
  const errors = useMemo(() => {
    const allErrors: ValidationError[] = []

    // 大会名のバリデーション
    if (!formData.title.trim()) {
      allErrors.push({ field: 'title', message: '大会名を入力してください' })
    } else if (formData.title.length > 100) {
      allErrors.push({ field: 'title', message: '大会名は100文字以内で入力してください' })
    }

    // 日程のバリデーション
    const { entry_start_at, entry_deadline, start_at } = formData

    if (entry_start_at && entry_deadline) {
      const startDate = new Date(entry_start_at)
      const deadlineDate = new Date(entry_deadline)

      if (startDate >= deadlineDate) {
        allErrors.push({
          field: 'entry_deadline',
          message: 'エントリー締切日時は開始日時より後に設定してください',
        })
      }
    }

    if (entry_deadline && start_at) {
      const deadlineDate = new Date(entry_deadline)
      const tournamentStartDate = new Date(start_at)

      if (deadlineDate >= tournamentStartDate) {
        allErrors.push({
          field: 'start_at',
          message: 'トーナメント開始日時はエントリー締切より後に設定してください',
        })
      }
    }

    // 参加者数のバリデーション
    if (formData.max_participants < 4) {
      allErrors.push({
        field: 'max_participants',
        message: '最大参加者数は4名以上に設定してください',
      })
    } else if (formData.max_participants > 128) {
      allErrors.push({
        field: 'max_participants',
        message: '最大参加者数は128名以下に設定してください',
      })
    }

    // カスタムフィールドのバリデーション
    customFields.forEach((field, index) => {
      // ラベルが空の場合はスキップ（保存時に除外される）
      if (!field.label.trim()) {
        return
      }

      // checkboxタイプでoptionsが空の場合
      if (field.inputType === 'checkbox') {
        if (!field.options || field.options.length === 0) {
          allErrors.push({
            field: `custom_field_${index}`,
            message: `「${field.label}」: チェックボックスには選択肢が必要です`,
          })
        }
      }

      // ラベルの重複チェック
      const duplicates = customFields.filter((f) => f.label === field.label && f.label.trim() !== '')
      if (duplicates.length > 1) {
        allErrors.push({
          field: `custom_field_${index}`,
          message: `「${field.label}」: 同じ項目名が複数存在します`,
        })
      }
    })

    return allErrors
  }, [formData, customFields])

  /**
   * バリデーションエラーがあるかどうか
   */
  const hasErrors = errors.length > 0

  /**
   * 特定のフィールドのエラーメッセージを取得
   */
  const getFieldError = useCallback(
    (field: string): string | null => {
      const error = errors.find((e) => e.field === field)
      return error?.message || null
    },
    [errors]
  )

  /**
   * バリデーションを実行してエラーをスロー
   */
  const validateAndThrow = useCallback(() => {
    if (hasErrors) {
      throw createValidationError(errors[0].message, errors)
    }
  }, [hasErrors, errors])

  return {
    errors,
    hasErrors,
    getFieldError,
    validateAndThrow,
  }
}
