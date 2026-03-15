import Image from 'next/image'
import { cn } from '@/lib/utils'

const DEFAULT_GRADIENTS = [
  'from-blue-600 to-blue-900',
  'from-red-600 to-red-900',
  'from-green-600 to-green-900',
  'from-purple-600 to-purple-900',
  'from-amber-500 to-amber-800',
]

function getDefaultGradient(id?: string): string {
  if (!id) return DEFAULT_GRADIENTS[0]
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DEFAULT_GRADIENTS[hash % DEFAULT_GRADIENTS.length]
}

type BannerImageProps = {
  src?: string | null
  alt: string
  id?: string
  variant?: 'hero' | 'thumbnail'
  priority?: boolean
  className?: string
}

export function BannerImage({
  src,
  alt,
  id,
  variant = 'hero',
  priority = false,
  className,
}: BannerImageProps) {
  const isHero = variant === 'hero'

  if (src) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          isHero ? 'aspect-[16/9] max-h-48 md:max-h-64 w-full rounded-lg' : 'aspect-[16/9] w-[120px] rounded-md shrink-0',
          className
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={isHero ? '(max-width: 768px) 100vw, 896px' : '120px'}
          priority={priority}
        />
      </div>
    )
  }

  const gradient = getDefaultGradient(id)

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br',
        gradient,
        isHero ? 'aspect-[16/9] max-h-48 md:max-h-64 w-full rounded-lg' : 'aspect-[16/9] w-[120px] rounded-md shrink-0',
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white/20 text-4xl font-bold select-none">
          {isHero ? 'K' : ''}
        </div>
      </div>
    </div>
  )
}
