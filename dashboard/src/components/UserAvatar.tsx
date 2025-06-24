import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBestAvatarUrl, getUserDisplayName, getUserInitials } from '../lib/userUtils';

interface UserAvatarProps {
  user: User | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showInitialsFallback?: boolean;
}

const sizeMap = {
  xs: { wrapper: 'w-6 h-6', text: 'text-xs' },
  sm: { wrapper: 'w-8 h-8', text: 'text-sm' },
  md: { wrapper: 'w-10 h-10', text: 'text-base' },
  lg: { wrapper: 'w-12 h-12', text: 'text-lg' },
  xl: { wrapper: 'w-16 h-16', text: 'text-xl' },
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export default function UserAvatar({ 
  user, 
  size = 'sm', 
  className = '',
  showInitialsFallback = true 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const avatarUrl = getBestAvatarUrl(user, sizePixels[size]);
  
  const sizeClasses = sizeMap[size];
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // If image failed to load or no URL, show initials fallback
  if (imageError || !avatarUrl || !showInitialsFallback) {
    return (
      <div 
        className={`
          ${sizeClasses.wrapper} 
          rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
          flex items-center justify-center text-white font-semibold
          shadow-sm border-2 border-white dark:border-gray-700
          ${className}
        `}
        title={displayName}
      >
        <span className={sizeClasses.text}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses.wrapper} ${className}`}>
      {/* Loading skeleton */}
      {imageLoading && (
        <div 
          className={`
            ${sizeClasses.wrapper} 
            rounded-full bg-gray-200 dark:bg-gray-700 
            animate-pulse absolute inset-0
            border-2 border-gray-300 dark:border-gray-600
          `}
        />
      )}
      
      {/* Actual image */}
      <img
        src={avatarUrl}
        alt={`${displayName}'s avatar`}
        className={`
          ${sizeClasses.wrapper} 
          rounded-full object-cover 
          border-2 border-gray-300 dark:border-gray-600 
          shadow-sm
          ${imageLoading ? 'opacity-0' : 'opacity-100'}
          transition-opacity duration-200
        `}
        onError={handleImageError}
        onLoad={handleImageLoad}
        title={displayName}
      />
    </div>
  );
} 