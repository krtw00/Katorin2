'use client'

import { useState, useCallback } from 'react'
import { Tournament } from '@/types/tournament'
import { TournamentFormat, MatchFormat, Visibility } from '@/types/database'

export interface TournamentFormData {
  title: string
  description: string
  tournament_format: TournamentFormat
  match_format: MatchFormat
  max_participants: number
  entry_limit_behavior: 'first_come' | 'waitlist'
  visibility: Visibility
  entry_start_at: string
  entry_deadline: string
  start_at: string
}

/**
 * datetime-local input用にDateをフォーマット
 */
function formatDateTimeLocal(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * フォームデータの初期値を生成
 */
function createInitialFormData(initialData?: Tournament): TournamentFormData {
  if (initialData) {
    return {
      title: initialData.title,
      description: initialData.description || '',
      tournament_format: initialData.tournament_format,
      match_format: initialData.match_format,
      max_participants: initialData.max_participants,
      entry_limit_behavior: initialData.entry_limit_behavior,
      visibility: initialData.visibility,
      entry_start_at: formatDateTimeLocal(initialData.entry_start_at),
      entry_deadline: formatDateTimeLocal(initialData.entry_deadline),
      start_at: formatDateTimeLocal(initialData.start_at),
    }
  }

  const now = new Date()
  return {
    title: '',
    description: '',
    tournament_format: 'single_elimination',
    match_format: 'bo3',
    max_participants: 32,
    entry_limit_behavior: 'first_come',
    visibility: 'public',
    entry_start_at: formatDateTimeLocal(now),
    entry_deadline: '',
    start_at: formatDateTimeLocal(now),
  }
}

/**
 * トーナメントフォームの状態管理フック
 */
export function useTournamentFormState(initialData?: Tournament) {
  const [formData, setFormData] = useState<TournamentFormData>(() =>
    createInitialFormData(initialData)
  )

  const updateFormData = useCallback((field: keyof TournamentFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const resetFormData = useCallback(() => {
    setFormData(createInitialFormData(initialData))
  }, [initialData])

  return {
    formData,
    updateFormData,
    resetFormData,
  }
}
