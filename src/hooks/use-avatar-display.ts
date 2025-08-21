import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAvatar } from './use-avatar';

export interface AvatarDisplayOptions {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  fallbackToInitials?: boolean;
  showOnlineStatus?: boolean;
  lazy?: boolean;
}

export function useAvatarDisplay(userId?: string, options: AvatarDisplayOptions = {}) {
  const { user } = useAuth();
  const { getUserAvatar } = useAvatar();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const getSizeClasses = useCallback((size: AvatarDisplayOptions['size'] = 'md') => {
    if (typeof size === 'number') {
      return {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`
      };
    }

    const sizeMap = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm', 
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl'
    };

    return sizeMap[size];
  }, []);

  const getInitials = useCallback((name?: string) => {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const fetchAvatar = useCallback(async () => {
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // If it's current user, use the hook
      if (targetUserId === user?.id) {
        const avatar = await getUserAvatar();
        setAvatarUrl(avatar && avatar !== 'SKIPPED' ? avatar : null);
      } else {
        // For other users, fetch directly (could be extended for public profiles)
        setAvatarUrl(null);
      }
    } catch (err) {
      console.error('Error fetching avatar:', err);
      setError('Failed to load avatar');
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user?.id, getUserAvatar]);

  useEffect(() => {
    if (!options.lazy) {
      fetchAvatar();
    }
  }, [fetchAvatar, options.lazy]);

  const loadAvatar = useCallback(() => {
    if (options.lazy) {
      fetchAvatar();
    }
  }, [fetchAvatar, options.lazy]);

  return {
    avatarUrl,
    isLoading,
    error,
    getSizeClasses,
    getInitials,
    loadAvatar,
    hasAvatar: !!avatarUrl,
    refetch: fetchAvatar
  };
}