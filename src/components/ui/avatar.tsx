import React, { useState } from 'react';
import { useAvatarDisplay, type AvatarDisplayOptions } from '@/hooks/use-avatar-display';
import { useAuth } from '@/contexts/auth-context';

interface AvatarProps extends AvatarDisplayOptions {
  userId?: string;
  name?: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export function Avatar({ 
  userId, 
  name, 
  className = '', 
  alt,
  onClick,
  ...options 
}: AvatarProps) {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  
  const {
    avatarUrl,
    isLoading,
    getSizeClasses,
    getInitials,
    hasAvatar,
    loadAvatar
  } = useAvatarDisplay(userId, options);

  // Get user info for fallbacks
  const targetUser = userId === user?.id ? user : null;
  const displayName = name || targetUser?.user_metadata?.full_name || targetUser?.email || '';
  const initials = getInitials(displayName);

  // Handle sizing
  const sizeClasses = getSizeClasses(options.size);
  const sizeStyle = typeof options.size === 'number' ? sizeClasses : undefined;

  // Base classes
  const baseClasses = `
    relative inline-flex items-center justify-center
    rounded-full bg-gradient-to-br from-purple-500 to-pink-500
    text-white font-semibold select-none overflow-hidden
    ${typeof options.size === 'string' ? sizeClasses : 'w-10 h-10'}
    ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Loading state
  if (isLoading && options.lazy) {
    return (
      <div 
        className={baseClasses}
        style={sizeStyle}
        onClick={() => {
          loadAvatar();
          onClick?.();
        }}
      >
        <div className="animate-pulse bg-gray-300 dark:bg-gray-600 rounded-full w-full h-full" />
      </div>
    );
  }

  // Avatar image
  if (hasAvatar && avatarUrl && !imageError) {
    return (
      <div className={baseClasses} style={sizeStyle} onClick={onClick}>
        <img
          src={avatarUrl}
          alt={alt || `${displayName}'s avatar`}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
        />
        
        {/* Online status indicator */}
        {options.showOnlineStatus && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
        )}
      </div>
    );
  }

  // Fallback to initials or default
  return (
    <div 
      className={baseClasses}
      style={sizeStyle} 
      onClick={onClick}
      title={displayName}
    >
      <span className="font-medium">
        {options.fallbackToInitials !== false ? initials : '?'}
      </span>
      
      {/* Online status indicator */}
      {options.showOnlineStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
      )}
    </div>
  );
}

// Convenience components for common sizes
export function AvatarXS(props: Omit<AvatarProps, 'size'>) {
  return <Avatar {...props} size="xs" />;
}

export function AvatarSM(props: Omit<AvatarProps, 'size'>) {
  return <Avatar {...props} size="sm" />;
}

export function AvatarMD(props: Omit<AvatarProps, 'size'>) {
  return <Avatar {...props} size="md" />;
}

export function AvatarLG(props: Omit<AvatarProps, 'size'>) {
  return <Avatar {...props} size="lg" />;
}

export function AvatarXL(props: Omit<AvatarProps, 'size'>) {
  return <Avatar {...props} size="xl" />;
}