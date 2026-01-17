'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tournament, CustomField } from '@/types/tournament'
import { TournamentFormData } from './useTournamentFormState'
import { handleError } from '@/lib/errors/handleError'
import { createUnauthorizedError } from '@/lib/errors/handleError'
import { safeSupabaseSingle, safeSupabaseMutation } from '@/lib/supabase/types'

export interface SubmitOptions {
  mode: 'create' | 'edit'
  tournamentId?: string
  asDraft?: boolean
  onSuccess?: (tournament: Tournament) => void
}

/**
 * フォームデータをDB保存用に変換
 */
function convertFormDataToDBFormat(
  formData: TournamentFormData,
  customFields: CustomField[]
) {
  return {
    title: formData.title,
    description: formData.description,
    tournament_format: formData.tournament_format,
    match_format: formData.match_format,
    max_participants: formData.max_participants,
    entry_limit_behavior: formData.entry_limit_behavior,
    visibility: formData.visibility,
    entry_start_at: formData.entry_start_at
      ? new Date(formData.entry_start_at).toISOString()
      : null,
    entry_deadline: formData.entry_deadline
      ? new Date(formData.entry_deadline).toISOString()
      : null,
    start_at: formData.start_at
      ? new Date(formData.start_at).toISOString()
      : null,
    custom_fields: customFields,
  }
}

/**
 * トーナメント保存処理のフック
 */
export function useTournamentSubmit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  /**
   * トーナメントを作成
   */
  const createTournament = useCallback(
    async (
      formData: TournamentFormData,
      customFields: CustomField[],
      asDraft: boolean = false
    ): Promise<Tournament> => {
      // ユーザー認証確認
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw createUnauthorizedError()
      }

      const tournamentData = convertFormDataToDBFormat(formData, customFields)

      // トーナメントを作成
      const tournament = await safeSupabaseMutation<Tournament>(
        supabase
          .from('tournaments')
          .insert({
            ...tournamentData,
            organizer_id: user.id,
            status: asDraft ? ('draft' as const) : ('recruiting' as const),
          })
          .select()
          .single()
      )

      return tournament
    },
    [supabase]
  )

  /**
   * トーナメントを更新
   */
  const updateTournament = useCallback(
    async (
      tournamentId: string,
      formData: TournamentFormData,
      customFields: CustomField[]
    ): Promise<Tournament> => {
      const tournamentData = convertFormDataToDBFormat(formData, customFields)

      // トーナメントを更新
      const tournament = await safeSupabaseMutation<Tournament>(
        supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', tournamentId)
          .select()
          .single()
      )

      return tournament
    },
    [supabase]
  )

  /**
   * 統一されたsubmit関数
   */
  const submit = useCallback(
    async (
      formData: TournamentFormData,
      customFields: CustomField[],
      options: SubmitOptions
    ) => {
      setError(null)
      setLoading(true)

      try {
        let tournament: Tournament

        if (options.mode === 'create') {
          tournament = await createTournament(
            formData,
            customFields,
            options.asDraft
          )
        } else {
          if (!options.tournamentId) {
            throw new Error('Tournament ID is required for edit mode')
          }
          tournament = await updateTournament(
            options.tournamentId,
            formData,
            customFields
          )
        }

        // 成功時の処理
        if (options.onSuccess) {
          options.onSuccess(tournament)
        } else {
          router.push(`/tournaments/${tournament.id}`)
        }

        return tournament
      } catch (err) {
        const error = handleError(err)
        setError(error.message)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [createTournament, updateTournament, router]
  )

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    submit,
    loading,
    error,
    clearError,
  }
}
