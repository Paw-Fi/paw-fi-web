import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';

export const Route = createFileRoute('/auth/confirm')({
  component: AuthConfirm,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token_hash: (search.token_hash as string) || undefined,
      type: (search.type as EmailOtpType) || undefined,
      next: (search.next as string) || undefined,
    };
  },
  loader: async ({ search }) => {
    const { token_hash, type, next } = search;

    if (token_hash && type) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash,
        });

        if (!error) {
          // Successfully verified, check if user needs to create avatar
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Check if user has avatar_url
            const { data: userData } = await supabase
              .from('users')
              .select('avatar_url')
              .eq('id', user.id)
              .single();
            
            // If no avatar, redirect to avatar customizer and PRESERVE intended destination
            if (!userData?.avatar_url) {
              throw redirect({
                to: '/avatar-customizer',
                search: next ? { redirect: next } : undefined,
                replace: true,
              });
            }
            
            // Otherwise go to intended destination (or dashboard)
            throw redirect({
              to: next || '/dashboard',
              replace: true,
            });
          } else {
            // Fallback if no user data
            throw redirect({
              to: next || '/dashboard',
              replace: true,
            });
          }
        }
      } catch (error) {
        // If it's a redirect, re-throw it
        if (error && typeof error === 'object' && 'href' in error) {
          throw error;
        }
        console.error('Email verification error:', error);
      }
    }

    // If verification failed or no token provided, redirect to error page
    throw redirect({
      to: '/auth/error',
      replace: true,
    });
  },
});

function AuthConfirm() {
  // This component should never render as the loader handles all cases
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
        <p className="text-gray-600">Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
}
