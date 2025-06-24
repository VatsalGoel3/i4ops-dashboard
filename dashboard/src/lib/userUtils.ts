import type { User } from '@supabase/supabase-js';

/**
 * Extract display name from user object
 * Priority: user_metadata.full_name > user_metadata.name > email prefix
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Unknown User';
  
  // Try user metadata first
  const metadata = user.user_metadata;
  if (metadata?.full_name) return metadata.full_name;
  if (metadata?.name) return metadata.name;
  if (metadata?.first_name && metadata?.last_name) {
    return `${metadata.first_name} ${metadata.last_name}`;
  }
  if (metadata?.first_name) return metadata.first_name;
  
  // Fallback to email prefix
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    // Convert email prefixes like "john.doe" or "john_doe" to "John Doe"
    return emailPrefix
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  return 'Unknown User';
}

/**
 * Get user's first name for casual greetings
 */
export function getUserFirstName(user: User | null): string {
  if (!user) return 'there';
  
  const metadata = user.user_metadata;
  if (metadata?.first_name) return metadata.first_name;
  
  const fullName = getUserDisplayName(user);
  return fullName.split(' ')[0];
}

/**
 * Generate initials from user's name
 */
export function getUserInitials(user: User | null): string {
  const name = getUserDisplayName(user);
  if (name === 'Unknown User') return 'UU';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get user avatar URL or generate a placeholder
 */
export function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  
  // Check various possible avatar fields
  const metadata = user.user_metadata;
  if (metadata?.avatar_url) return metadata.avatar_url;
  if (metadata?.picture) return metadata.picture; // Google OAuth
  if (metadata?.avatar) return metadata.avatar;
  
  // Check user identities for OAuth providers
  if (user.identities) {
    for (const identity of user.identities) {
      if (identity.identity_data?.avatar_url) {
        return identity.identity_data.avatar_url;
      }
      if (identity.identity_data?.picture) {
        return identity.identity_data.picture;
      }
    }
  }
  
  return null;
}

/**
 * Generate Gravatar URL based on email
 */
export function getGravatarUrl(email: string, size: number = 80): string {
  // Simple hash function for email (in production, use a proper crypto library)
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use a deterministic but varied background color based on email
  const colors = [
    '4F46E5', '7C3AED', 'DB2777', 'DC2626', 'EA580C', 
    '059669', '0891B2', '1D4ED8', '7E22CE', 'BE185D'
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];
  
  // Use UI Avatars service for consistent, nice-looking avatars
  const initials = getUserInitials({ email } as User);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${bgColor}&color=fff&bold=true&format=svg`;
}

/**
 * Get the best available avatar URL for a user
 */
export function getBestAvatarUrl(user: User | null, size: number = 80): string {
  if (!user) {
    return `https://ui-avatars.com/api/?name=UU&size=${size}&background=6B7280&color=fff&bold=true&format=svg`;
  }
  
  // Try to get user's actual avatar first
  const userAvatar = getUserAvatarUrl(user);
  if (userAvatar) return userAvatar;
  
  // Fallback to Gravatar if user has email
  if (user.email) {
    return getGravatarUrl(user.email, size);
  }
  
  // Final fallback
  const initials = getUserInitials(user);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=6B7280&color=fff&bold=true&format=svg`;
}

/**
 * Get user role with proper fallback
 */
export function getUserRole(user: User | null): string {
  if (!user) return 'guest';
  
  const metadata = user.user_metadata;
  if (metadata?.role) return metadata.role;
  
  // Default role based on email domain (you can customize this logic)
  if (user.email?.includes('@yourcompany.com')) return 'admin';
  
  return 'user';
} 