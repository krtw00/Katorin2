import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ENDPOINT = process.env.R2_ENDPOINT || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'katorin2-assets'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export type UploadResult = {
  key: string
  url: string
}

/**
 * R2にファイルをアップロード
 */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<UploadResult> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  )

  return {
    key,
    url: getR2PublicUrl(key),
  }
}

/**
 * R2からファイルを削除
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
}

/**
 * 署名付きアップロードURLを生成（クライアントから直接アップロード用）
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  return await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  )
}

/**
 * 署名付きダウンロードURLを生成（非公開ファイル用）
 */
export async function getDownloadPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  return await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn }
  )
}

/**
 * R2の公開URL
 */
export function getR2PublicUrl(key: string): string {
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  if (publicUrl) return `${publicUrl}/${key}`
  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`
}

/**
 * ストレージキーを生成
 */
export function generateStorageKey(
  category: 'avatars' | 'team-avatars' | 'tournament-covers' | 'entry-images',
  userId: string,
  filename: string
): string {
  const ext = filename.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  return `${category}/${userId}/${timestamp}.${ext}`
}
