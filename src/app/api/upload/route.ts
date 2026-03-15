import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUploadPresignedUrl, generateStorageKey } from '@/lib/storage/r2'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE: Record<string, number> = {
  avatars: 2 * 1024 * 1024,
  'team-avatars': 2 * 1024 * 1024,
  'tournament-covers': 5 * 1024 * 1024,
  'entry-images': 3 * 1024 * 1024,
}

/**
 * 署名付きアップロードURL発行
 * POST /api/upload
 * Body: { category, filename, contentType }
 * Returns: { uploadUrl, publicUrl, key }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { category, filename, contentType, fileSize } = body as {
    category: string
    filename: string
    contentType: string
    fileSize?: number
  }

  if (!category || !filename || !contentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const maxSize = MAX_SIZE[category]
  if (!maxSize) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  if (fileSize && fileSize > maxSize) {
    return NextResponse.json({ error: `File too large. Max: ${maxSize / 1024 / 1024}MB` }, { status: 400 })
  }

  const key = generateStorageKey(
    category as 'avatars' | 'team-avatars' | 'tournament-covers' | 'entry-images',
    user.id,
    filename
  )

  const uploadUrl = await getUploadPresignedUrl(key, contentType)
  const { getR2PublicUrl } = await import('@/lib/storage/r2')
  const publicUrl = getR2PublicUrl(key)

  return NextResponse.json({ uploadUrl, publicUrl, key })
}
