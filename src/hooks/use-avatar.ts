import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import * as domtoimage from 'dom-to-image';
import { getCriticalQueryConfig, getStandardQueryConfig, retryOperation } from '@/lib/query-config';

// Query keys for TanStack Query
const AVATAR_QUERY_KEYS = {
  avatar: (userId: string) => ['avatar', userId] as const,
  customization: (userId: string) => ['avatar-customization', userId] as const,
  hasAvatar: (userId: string) => ['has-avatar', userId] as const,
};

// Image compression utility (no longer needed as we handle it inline)
// const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.8): string => {
//   return canvas.toDataURL('image/jpeg', quality);
// };


// Image compression utility (no longer needed as we handle it inline)
// const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.8): string => {
//   return canvas.toDataURL('image/jpeg', quality);
// };

export function useAvatar() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query function to get user avatar URL
  const fetchUserAvatar = async (): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching avatar:', error);
      return null;
    }

    return data?.avatar_url || null;
  };

  // Query function to get avatar customization
  const fetchAvatarCustomization = async (): Promise<{ 
    elements: { [key: string]: string } | null; 
    colors: { [key: string]: string } | null; 
  }> => {
    if (!user) return { elements: null, colors: null };

    const { data, error } = await supabase
      .from('users')
      .select('avatar_elements, avatar_colors')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching avatar customization:', error);
      return { elements: null, colors: null };
    }

    return {
      elements: data?.avatar_elements || null,
      colors: data?.avatar_colors || null
    };
  };

  // Query function to check if user has avatar
  const fetchUserHasAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking avatar:', error);
      return false;
    }

    return !!data?.avatar_url && data.avatar_url !== 'SKIPPED';
  };

  // TanStack Query hooks with production-optimized retry configuration
  const avatarQuery = useQuery({
    queryKey: user ? AVATAR_QUERY_KEYS.avatar(user.id) : [],
    queryFn: fetchUserAvatar,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...getCriticalQueryConfig(), // Critical query - needs maximum retries
  });

  const customizationQuery = useQuery({
    queryKey: user ? AVATAR_QUERY_KEYS.customization(user.id) : [],
    queryFn: fetchAvatarCustomization,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...getStandardQueryConfig(), // Standard query
  });

  const hasAvatarQuery = useQuery({
    queryKey: user ? AVATAR_QUERY_KEYS.hasAvatar(user.id) : [],
    queryFn: fetchUserHasAvatar,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...getCriticalQueryConfig(), // Critical for UI state - needs maximum retries
  });

  const saveAvatar = async (
    avatarRef: HTMLDivElement, 
    options?: { 
      quality?: number; 
      skipCompression?: boolean;
      avatarElements?: { [key: string]: string };
      avatarColors?: { [key: string]: string };
    }
  ): Promise<{ success: boolean; avatarUrl?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(10);

      // Get actual dimensions of the avatar element
      const rect = avatarRef.getBoundingClientRect();
      const actualWidth = rect.width;
      const actualHeight = rect.height;
      
      // Calculate scale to get a good resolution (aim for ~400px width)
      const targetWidth = 400;
      const scale = targetWidth / actualWidth;
      const scaledHeight = actualHeight * scale;

      // Generate PNG from avatar element using domtoimage.toPng
      const dataUrl = await domtoimage.toPng(avatarRef, {
        width: targetWidth,
        height: scaledHeight,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }
      });

      setUploadProgress(30);

      // Convert data URL to blob for compression if needed
      let finalDataUrl: string;
      let mimeType: string;
      let extension: string;

      if (options?.skipCompression) {
        finalDataUrl = dataUrl;
        mimeType = 'image/png';
        extension = 'png';
      } else {
        // Create a canvas from the data URL for compression
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        ctx.drawImage(img, 0, 0, targetWidth, scaledHeight);
        
        // Compress to JPEG for smaller file size
        finalDataUrl = canvas.toDataURL('image/jpeg', options?.quality || 0.85);
        mimeType = 'image/jpeg';
        extension = 'jpg';
      }

      setUploadProgress(50);

      // Convert data URL to a properly typed blob
      const response = await fetch(finalDataUrl);
      const originalBlob = await response.blob();
      
      // Create a new blob with explicit MIME type to ensure correct content type
      const typedBlob = new Blob([originalBlob], { type: mimeType });

      // Validate file size (2MB limit)
      if (typedBlob.size > 2 * 1024 * 1024) {
        throw new Error('Avatar file too large. Please try with lower quality.');
      }

      setUploadProgress(60);

      // Use user ID as folder and filename to match RLS policies
      const fileName = `${user.id}/avatar.${extension}`;

      // Upload with retry logic
      const uploadOperation = async () => {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, typedBlob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true // This will overwrite existing file with same name
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        return uploadData;
      };

      await retryOperation(uploadOperation);
      setUploadProgress(80);

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Cache busting

      // Update user's avatar_url and customization data in the database with retry
      const updateOperation = async () => {
        const updateData: any = { 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        };
        
        // Include avatar customization data if provided
        if (options?.avatarElements) {
          updateData.avatar_elements = options.avatarElements;
        }
        if (options?.avatarColors) {
          updateData.avatar_colors = options.avatarColors;
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }
      };

      await retryOperation(updateOperation);
      setUploadProgress(100);

      // Invalidate all avatar-related queries after successful save
      if (user) {
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.avatar(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.customization(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.hasAvatar(user.id) });
      }

      return { success: true, avatarUrl };

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save avatar';
      setError(errorMessage);
      console.error('Avatar save error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // These functions are now replaced by the TanStack Query hooks above

  const deleteAvatar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Get current avatar to determine file extension
      const currentAvatar = avatarQuery.data;
      if (!currentAvatar || currentAvatar === 'SKIPPED') {
        return { success: true }; // Nothing to delete
      }

      // Determine file extension from URL or try both
      const extensions = ['jpg', 'png'];
      for (const ext of extensions) {
        const fileName = `${user.id}/avatar.${ext}`;
        await supabase.storage
          .from('avatars')
          .remove([fileName]);
      }

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // Invalidate all avatar-related queries after successful delete
      if (user) {
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.avatar(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.customization(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.hasAvatar(user.id) });
      }

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete avatar';
      console.error('Avatar delete error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const skipAvatarForNow = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Set a special flag to indicate user skipped avatar creation
      const { error } = await supabase
        .from('users')
        .update({ 
          avatar_url: 'SKIPPED',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to update skip status: ${error.message}`);
      }

      // Invalidate all avatar-related queries after successful skip
      if (user) {
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.avatar(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.customization(user.id) });
        await queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEYS.hasAvatar(user.id) });
      }

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to skip avatar';
      console.error('Avatar skip error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const shouldPromptForAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url, created_at')
        .eq('id', user.id)
        .single();

      if (error) return false;

      // If no avatar_url or it's marked as skipped, check if we should prompt again
      if (!data?.avatar_url || data.avatar_url === 'SKIPPED') {
        // Prompt again after 7 days for skipped users
        if (data.avatar_url === 'SKIPPED') {
          const createdAt = new Date(data.created_at);
          const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCreation >= 7;
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error checking avatar prompt:', err);
      return false;
    }
  };

  // getAvatarCustomization is now replaced by customizationQuery above

  return {
    // Mutation functions
    saveAvatar,
    deleteAvatar,
    skipAvatarForNow,
    shouldPromptForAvatar,
    
    // Query data and states
    avatarUrl: avatarQuery.data,
    isAvatarLoading: avatarQuery.isLoading,
    avatarError: avatarQuery.error,
    
    customization: customizationQuery.data,
    isCustomizationLoading: customizationQuery.isLoading,
    customizationError: customizationQuery.error,
    
    hasAvatar: hasAvatarQuery.data,
    isHasAvatarLoading: hasAvatarQuery.isLoading,
    hasAvatarError: hasAvatarQuery.error,
    
    // Legacy functions (deprecated - use query data above)
    checkUserHasAvatar: () => hasAvatarQuery.data,
    getUserAvatar: () => avatarQuery.data,
    getAvatarCustomization: () => customizationQuery.data,
    
    // Upload states
    isUploading,
    uploadProgress,
    error
  };
}