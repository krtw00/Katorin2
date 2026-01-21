'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  onUpload: (file: File) => Promise<string>
  shape?: 'circle' | 'square'
  size?: 'sm' | 'md' | 'lg'
  placeholder?: React.ReactNode
  className?: string
  maxSizeMB?: number
  accept?: string
  disabled?: boolean
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  shape = 'circle',
  size = 'md',
  placeholder,
  className,
  maxSizeMB = 2,
  accept = 'image/*',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`ファイルサイズは${maxSizeMB}MB以下にしてください`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const url = await onUpload(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const displayImage = preview || value

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative group">
        <div
          className={cn(
            sizeClasses[size],
            'relative overflow-hidden bg-muted flex items-center justify-center',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {displayImage ? (
            <Image
              src={displayImage}
              alt="Preview"
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            placeholder || <Camera className="w-8 h-8 text-muted-foreground" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!disabled && !uploading && (
            <div
              className={cn(
                'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer',
                shape === 'circle' ? 'rounded-full' : 'rounded-lg'
              )}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {displayImage && !disabled && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!displayImage && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              画像を選択
            </>
          )}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
