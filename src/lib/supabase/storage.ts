import { SupabaseClient } from '@supabase/supabase-js'

export type StorageBucket = 'entry-images' | 'tournament-covers' | 'team-avatars' | 'avatars'

export interface UploadResult {
  url: string
  path: string
}

export interface UploadError {
  message: string
}

/**
 * Generate a unique file path for storage
 */
function generateFilePath(
  userId: string,
  fileName: string,
  prefix?: string
): string {
  const timestamp = Date.now()
  const ext = fileName.split('.').pop() || 'jpg'
  const safeName = `${timestamp}.${ext}`

  if (prefix) {
    return `${userId}/${prefix}/${safeName}`
  }
  return `${userId}/${safeName}`
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  file: File,
  userId: string,
  prefix?: string
): Promise<UploadResult | UploadError> {
  const filePath = generateFilePath(userId, file.name, prefix)

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return { message: error.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return {
    url: publicUrl,
    path: filePath,
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check if result is an error
 */
export function isUploadError(result: UploadResult | UploadError): result is UploadError {
  return 'message' in result
}

/**
 * Upload an entry image (for custom fields in tournament entry)
 */
export async function uploadEntryImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  tournamentId: string
): Promise<UploadResult | UploadError> {
  return uploadFile(supabase, 'entry-images', file, userId, tournamentId)
}

/**
 * Upload a tournament cover image
 */
export async function uploadTournamentCover(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<UploadResult | UploadError> {
  return uploadFile(supabase, 'tournament-covers', file, userId)
}

/**
 * Upload a team avatar
 */
export async function uploadTeamAvatar(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<UploadResult | UploadError> {
  return uploadFile(supabase, 'team-avatars', file, userId)
}

/**
 * Upload a user avatar
 */
export async function uploadUserAvatar(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<UploadResult | UploadError> {
  return uploadFile(supabase, 'avatars', file, userId)
}
