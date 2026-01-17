'use client'

import { useState, useCallback } from 'react'
import { CustomField } from '@/types/tournament'

/**
 * ラベルからキーを自動生成
 */
function generateKeyFromLabel(label: string, fallbackIndex: number): string {
  const key = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  return key || `field_${fallbackIndex}`
}

/**
 * カスタムフィールドの管理フック
 */
export function useCustomFieldsManager(initialFields?: CustomField[]) {
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialFields || []
  )

  /**
   * 新しいカスタムフィールドを追加
   */
  const addCustomField = useCallback(() => {
    const newField: CustomField = {
      key: `field_${Date.now()}`,
      label: '',
      inputType: 'text',
      required: false,
      hidden: false,
      editDeadline: 'bracket_published',
      placeholder: '',
      options: [],
    }
    setCustomFields((prev) => [...prev, newField])
  }, [])

  /**
   * カスタムフィールドを更新
   * ラベルが変更された場合はキーも自動更新
   */
  const updateCustomField = useCallback((index: number, field: Partial<CustomField>) => {
    setCustomFields((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...field }

      // ラベルが変更された場合はキーも更新
      if (field.label !== undefined) {
        updated[index].key = generateKeyFromLabel(field.label, index)
      }

      return updated
    })
  }, [])

  /**
   * カスタムフィールドを削除
   */
  const removeCustomField = useCallback((index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * カスタムフィールドを複製
   */
  const duplicateCustomField = useCallback((index: number) => {
    setCustomFields((prev) => {
      const fieldToCopy = prev[index]
      const duplicated: CustomField = {
        ...fieldToCopy,
        key: `${fieldToCopy.key}_copy_${Date.now()}`,
        label: `${fieldToCopy.label}（コピー）`,
      }
      return [...prev, duplicated]
    })
  }, [])

  /**
   * 空のラベルを持つフィールドを除外して返す
   */
  const getValidCustomFields = useCallback(() => {
    return customFields.filter((field) => field.label.trim() !== '')
  }, [customFields])

  /**
   * カスタムフィールド全体をリセット
   */
  const resetCustomFields = useCallback(() => {
    setCustomFields(initialFields || [])
  }, [initialFields])

  return {
    customFields,
    addCustomField,
    updateCustomField,
    removeCustomField,
    duplicateCustomField,
    getValidCustomFields,
    resetCustomFields,
  }
}
