import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown } from '@fortawesome/free-solid-svg-icons';
import { useAvatar } from '@/hooks/use-avatar';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import { motion } from 'framer-motion';

interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showPremiumBorder?: boolean;
  showPremiumCrown?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  xs: 'size-6 text-xs',
  sm: 'size-8 text-sm', 
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg'
};

const crownSizeClasses = {
  xs: 'size-2 -top-0.5 -right-0.5',
  sm: 'size-3 -top-0.5 -right-0.5',
  md: 'size-4 -top-1 -right-1',
  lg: 'size-5 -top-1 -right-1',
  xl: 'size-6 -top-1.5 -right-1.5'
};

const crownIconSizeClasses = {
  xs: 'size-1',
  sm: 'size-1.5',
  md: 'size-2.5',
  lg: 'size-3',
  xl: 'size-4'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'md',
  showPremiumBorder = true,
  showPremiumCrown = true,
  onClick,
  className = ''
}) => {
  const { user } = useAuth();
  const { avatarUrl, isAvatarLoading } = useAvatar();
  const { isActive } = useSubscription(user?.id);

  if (!user) {
    return null;
  }

  const userInitials = user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 
                      user.email?.charAt(0)?.toUpperCase() || 
                      'U';

  const avatarContent = (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Premium Border Container */}
      <div className={`relative rounded-full p-0.5 ${
        isActive && showPremiumBorder
          ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg shadow-amber-500/30' 
          : ''
      }`}>
        {/* Avatar Container */}
        <div className={`flex items-center justify-center overflow-hidden rounded-full ${sizeClasses[size]} ${
          isActive && showPremiumBorder ? 'shadow-md' : 'shadow-sm'
        }`}>
          {isAvatarLoading ? (
            // Loading skeleton
            <div className="bg-gray-200 dark:bg-gray-600 animate-pulse w-full h-full rounded-full" />
          ) : avatarUrl && avatarUrl !== 'SKIPPED' ? (
            // User's uploaded avatar
            <img 
              src={avatarUrl} 
              alt={user.user_metadata?.full_name || 'User Avatar'} 
              className="w-full h-full object-cover"
              onError={() => setAvatarUrl(null)} // Fallback to initials if image fails to load
            />
          ) : (
            // Fallback to initials
            <div className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white font-semibold w-full h-full flex items-center justify-center">
              {userInitials}
            </div>
          )}
        </div>
      </div>
      
      {/* Premium Crown Icon */}
      {isActive && showPremiumCrown && (
        <div className={`absolute flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md ${crownSizeClasses[size]}`}>
          <FontAwesomeIcon 
            icon={faCrown} 
            className={`text-amber-900 ${crownIconSizeClasses[size]}`} 
          />
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <motion.div
        className="cursor-pointer"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
      >
        {avatarContent}
      </motion.div>
    );
  }

  return avatarContent;
};