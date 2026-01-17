'use client'

import { useMemo } from 'react'
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
   * 大会名のバリデーション
   */
  const validateTitle = (title: string): ValidationError | null => {
    if (!title.trim()) {
      return { field: 'title', message: '大会名を入力してください' }
    }
    if (title.length > 100) {
      return { field: 'title', message: '大会名は100文字以内で入力してください' }
    }
    return null
  }

  /**
   * 日程のバリデーション
   */
  const validateSchedule = (): ValidationError | null => {
    const { entry_start_at, entry_deadline, start_at } = formData

    // エントリー開始日と締切日の両方が設定されている場合のみチェック
    if (entry_start_at && entry_deadline) {
      const startDate = new Date(entry_start_at)
      const deadlineDate = new Date(entry_deadline)

      if (startDate >= deadlineDate) {
        return {
          field: 'entry_deadline',
          message: 'エントリー締切日時は開始日時より後に設定してください',
        }
      }
    }

    // 締切日とトーナメント開始日の両方が設定されている場合のみチェック
    if (entry_deadline && start_at) {
      const deadlineDate = new Date(entry_deadline)
      const tournamentStartDate = new Date(start_at)

      if (deadlineDate >= tournamentStartDate) {
        return {
          field: 'start_at',
          message: 'トーナメント開始日時はエントリー締切より後に設定してください',
        }
      }
    }

    return null
  }

  /**
   * カスタムフィールドのバリデーション
   */
  const validateCustomFields = (): ValidationError[] => {
    const errors: ValidationError[] = []

    customFields.forEach((field, index) => {
      // ラベルが空の場合はスキップ（保存時に除外される）
      if (!field.label.trim()) {
        return
      }

      // checkboxタイプでoptionsが空の場合
      if (field.inputType === 'checkbox') {
        if (!field.options || field.options.length === 0) {
          errors.push({
            field: `custom_field_${index}`,
            message: `「${field.label}」: チェックボックスには選択肢が必要です`,
          })
        }
      }

      // ラベルの重複チェック
      const duplicates = customFields.filter((f) => f.label === field.label && f.label.trim() !== '')
      if (duplicates.length > 1) {
        errors.push({
          field: `custom_field_${index}`,
          message: `「${field.label}」: 同じ項目名が複数存在します`,
        })
      }
    })

    return errors
  }

  /**
   * 参加者数のバリデーション
   */
  const validateParticipants = (): ValidationError | null => {
    const { max_participants } = formData

    if (max_participants < 4) {
      return {
        field: 'max_participants',
        message: '最大参加者数は4名以上に設定してください',
      }
    }

    if (max_participants > 128) {
      return {
        field: 'max_participants',
        message: '最大参加者数は128名以下に設定してください',
      }
    }

    return null
  }

  /**
   * 全てのバリデーションを実行
   */
  const errors = useMemo(() => {
    const allErrors: ValidationError[] = []

    // 大会名
    const titleError = validateTitle(formData.title)
    if (titleError) allErrors.push(titleError)

    // 日程
    const scheduleError = validateSchedule()
    if (scheduleError) allErrors.push(scheduleError)

    // 参加者数
    const participantsError = validateParticipants()
    if (participantsError) allErrors.push(participantsError)

    // カスタムフィールド
    const customFieldErrors = validateCustomFields()
    allErrors.push(...customFieldErrors)

    return allErrors
  }, [formData, customFields])

  /**
   * バリデーションエラーがあるかどうか
   */
  const hasErrors = errors.length > 0

  /**
   * 特定のフィールドのエラーメッセージを取得
   */
  const getFieldError = (field: string): string | null => {
    const error = errors.find((e) => e.field === field)
    return error?.message || null
  }

  /**
   * バリデーションを実行してエラーをスロー
   */
  const validateAndThrow = () => {
    if (hasErrors) {
      throw createValidationError(errors[0].message, errors)
    }
  }

  return {
    errors,
    hasErrors,
    getFieldError,
    validateAndThrow,
  }
}
