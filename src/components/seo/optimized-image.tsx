import React, { useState, useRef, useEffect } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: string
  quality?: number
  sizes?: string
  aspectRatio?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  quality = 80,
  sizes,
  aspectRatio,
  loading = 'lazy',
  decoding = 'async',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  const containerStyle = aspectRatio ? { aspectRatio } : {}
  const imageClasses = `
    transition-opacity duration-300 ease-in-out
    ${isLoaded ? 'opacity-100' : 'opacity-0'}
    ${className}
  `.trim()

  return (
    <div 
      className="relative overflow-hidden"
      style={containerStyle}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={imageClasses}
          loading={loading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          sizes={sizes}
          style={{ 
            objectFit: 'cover',
            width: '100%',
            height: '100%'
          }}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  )
}

export function HeroImage(props: Omit<OptimizedImageProps, 'priority'>) {
  return (
    <OptimizedImage
      {...props}
      priority={true}
      loading="eager"
      decoding="sync"
    />
  )
}

export function LazyImage(props: OptimizedImageProps) {
  return (
    <OptimizedImage
      {...props}
      loading="lazy"
      decoding="async"
    />
  )
}