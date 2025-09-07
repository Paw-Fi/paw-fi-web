import classNames from 'classnames'
import React, { useState, useRef, useEffect } from 'react'

interface ResponsiveSource {
  src: string
  width: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
}

interface OptimizedImageProps {
  src: string
  webpSrc?: string // Optional WebP version - parent must provide explicitly
  responsiveSources?: ResponsiveSource[] // Multiple sizes for responsive srcset
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
  webpSupport?: boolean
  fallbackFormat?: 'png' | 'jpg'
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  webpSrc,
  responsiveSources,
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
  webpSupport = true,
  fallbackFormat = 'png',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const containerRef = useRef<HTMLDivElement>(null)

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

    if (containerRef.current) {
      observer.observe(containerRef.current)
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

  // Use provided sources - no automatic conversion
  // WebP version only used if explicitly provided by parent component
  const fallbackSrc = src

  // Generate responsive srcset from multiple sources
  const generateSrcSet = (sources: ResponsiveSource[], format?: string) => {
    if (!sources || sources.length === 0) return undefined
    
    const filteredSources = format 
      ? sources.filter(s => s.format === format)
      : sources
    
    if (filteredSources.length === 0) return undefined
    
    return filteredSources
      .map(source => `${source.src} ${source.width}w`)
      .join(', ')
  }

  // Group responsive sources by format
  const groupedSources = responsiveSources ? responsiveSources.reduce((acc, source) => {
    const format = source.format || 'jpg'
    if (!acc[format]) acc[format] = []
    acc[format].push(source)
    return acc
  }, {} as Record<string, ResponsiveSource[]>) : {}

  // Sort formats by preference (AVIF -> WebP -> JPG/PNG)
  const formatOrder = ['avif', 'webp', 'jpg', 'png']
  const sortedFormats = Object.keys(groupedSources).sort((a, b) => {
    const aIndex = formatOrder.indexOf(a)
    const bIndex = formatOrder.indexOf(b)
    return (aIndex === -1 ? formatOrder.length : aIndex) - (bIndex === -1 ? formatOrder.length : bIndex)
  })

  const containerStyle = aspectRatio ? { aspectRatio } : {}
  return (
    <div 
      ref={containerRef}
      className={classNames("relative overflow-hidden", className)}
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
      
      {/* Main image with responsive srcset support */}
      {isInView && (
        <picture className="w-full h-full">
          {/* Responsive sources by format */}
          {sortedFormats.map(format => {
            const srcSet = generateSrcSet(groupedSources[format], format)
            if (!srcSet) return null
            
            const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`
            return (
              <source
                key={format}
                srcSet={srcSet}
                type={mimeType}
                sizes={sizes}
              />
            )
          })}
          
          {/* Legacy single WebP source support */}
          {webpSupport && webpSrc && webpSrc !== fallbackSrc && !responsiveSources && (
            <source srcSet={webpSrc} type="image/webp" sizes={sizes} />
          )}
          
          {/* Fallback img with responsive srcset */}
          <img
            src={fallbackSrc}
            srcSet={responsiveSources ? generateSrcSet(responsiveSources) : undefined}
            alt={alt}
            width={width}
            height={height}
            className={classNames("w-full h-full transition-opacity duration-300 ease-in-out", className, {
              "opacity-100": isLoaded,
              "opacity-0": !isLoaded,
            })}
            loading={loading}
            decoding={decoding}
            onLoad={handleLoad}
            onError={handleError}
            sizes={sizes}
          />
        </picture>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
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