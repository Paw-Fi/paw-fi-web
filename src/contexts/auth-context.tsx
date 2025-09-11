'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Extend the Supabase User type to include uid property
export interface User extends SupabaseUser {
  uid: string; // Alias for id to maintain compatibility with our conversation service
}

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, userData: { full_name: string }, redirectUrl?: string) => Promise<{ success: boolean; data: any }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; data: any }>;
  signOut: () => Promise<{ success: boolean }>;
  resetPassword: (email: string, redirectUrl?: string) => Promise<{ success: boolean; data?: any }>;
  deleteAccount: () => Promise<{ success: boolean }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to transform SupabaseUser to our extended User type
  const transformUser = (supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null;
    
    return {
      ...supabaseUser,
      uid: supabaseUser.id // Map id to uid for compatibility
    };
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(transformUser(session?.user ?? null));
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(transformUser(session?.user ?? null));
        
        // Update last login for sign-in events
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id);
          } catch (error) {
            console.error('Error updating last login:', error);
          }
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: { full_name: string }, redirectUrl?: string) => {
    setIsLoading(true);
    
    try {
      // The user metadata will be used by our database trigger to populate the users table
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectUrl || '/dashboard')}`,
          data: userData
        },
      });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  const signOut = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, redirectUrl?: string) => {
    try {
      const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${redirectUrl || '/reset-password'}`,
      });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user is currently logged in');
    }
    
    try {
      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) throw authError;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAuthenticated, signUp, signIn, signOut, resetPassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // During SSR/hydration, context might be temporarily undefined
  // Add a safety check to prevent hydration errors
  if (typeof window !== 'undefined' && context === undefined) {
    // On client-side, if context is undefined, it means we're in a hydration race condition
    // Return a safe default state that matches the initial AuthProvider state
    return {
      user: null,
      session: null,
      isLoading: true, // Keep loading true during hydration
      isAuthenticated: false,
      signUp: async () => ({ success: false, data: null }),
      signIn: async () => ({ success: false, data: null }),
      signOut: async () => ({ success: false }),
      resetPassword: async () => ({ success: false }),
      deleteAccount: async () => ({ success: false }),
    } as AuthContextType;
  }
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
