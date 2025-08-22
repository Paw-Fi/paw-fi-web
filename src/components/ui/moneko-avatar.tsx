import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAvatarDisplay, AvatarDisplayOptions } from "@/hooks/use-avatar-display"
import { cn } from "@/lib/utils"

interface MonekoAvatarProps extends AvatarDisplayOptions {
  userId?: string
  className?: string
  name?: string
  src?: string // Allow manual override of avatar URL
  alt?: string
  showOnlineStatus?: boolean
  onlineStatusClassName?: string
}

export function MonekoAvatar({
  userId,
  size = 'md',
  fallbackToInitials = true,
  showOnlineStatus = false,
  lazy = false,
  className,
  name,
  src,
  alt,
  onlineStatusClassName,
}: MonekoAvatarProps) {
  const {
    avatarUrl,
    isLoading,
    error,
    getSizeClasses,
    getInitials,
    loadAvatar,
    hasAvatar,
  } = useAvatarDisplay(userId, { size, fallbackToInitials, showOnlineStatus, lazy })

  // Use manual src if provided, otherwise use hook result
  const finalAvatarUrl = src || avatarUrl

  // Get size classes for consistent sizing
  const sizeClasses = getSizeClasses(size)
  const sizeClassString = typeof sizeClasses === 'string' ? sizeClasses : ''

  return (
    <div className="relative inline-block">
      <Avatar 
        className={cn(sizeClassString, className)}
        style={typeof sizeClasses === 'object' ? sizeClasses : undefined}
      >
        <AvatarImage 
          src={finalAvatarUrl || undefined}
          alt={alt || name || 'Avatar'}
          onLoad={lazy ? loadAvatar : undefined}
        />
        <AvatarFallback>
          {fallbackToInitials && name ? getInitials(name) : '?'}
        </AvatarFallback>
      </Avatar>

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <div 
          className={cn(
            "absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-background",
            // Size the status indicator based on avatar size
            typeof size === 'string' ? {
              'xs': 'h-2 w-2',
              'sm': 'h-2.5 w-2.5', 
              'md': 'h-3 w-3',
              'lg': 'h-3.5 w-3.5',
              'xl': 'h-4 w-4'
            }[size] : 'h-3 w-3',
            onlineStatusClassName
          )}
        />
      )}
    </div>
  )
}

export { MonekoAvatar as EnhancedAvatar }