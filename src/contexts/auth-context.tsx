"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Extend the Supabase User type to include uid property
export interface User extends SupabaseUser {
  uid: string; // Alias for id to maintain compatibility with our conversation service
}

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    userData: { full_name: string },
    redirectUrl?: string,
  ) => Promise<{ success: boolean; data: any }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; data: any }>;
  signOut: () => Promise<{ success: boolean }>;
  resetPassword: (
    email: string,
    redirectUrl?: string,
  ) => Promise<{ success: boolean; data?: any }>;
  changeEmail: (
    email: string,
    redirectUrl?: string,
  ) => Promise<{ success: boolean; data?: any }>;
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
      uid: supabaseUser.id, // Map id to uid for compatibility
    };
  };

  useEffect(() => {
    let subscription:
      | ReturnType<
          typeof supabase.auth.onAuthStateChange
        >["data"]["subscription"]
      | null = null;
    let cancelled = false;
    let hasInitialized = false;

    const syncAuthState = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(transformUser(nextSession?.user ?? null));
      setIsLoading(false);
    };

    const syncUserEmailToProfileTable = (userId: string, email?: string | null) => {
      if (!email) {
        return;
      }

      window.setTimeout(() => {
        void supabase
          .from("users")
          .update({ email, updated_at: new Date().toISOString() })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) {
              console.error("Error syncing profile email:", error);
            }
          })
          .catch((error) => {
            console.error("Error syncing profile email:", error);
          });
      }, 0);
    };

    const updateLastLogin = (userId: string) => {
      window.setTimeout(() => {
        void supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating last login:", error);
            }
          })
          .catch((error) => {
            console.error("Error updating last login:", error);
          });
      }, 0);
    };

    const runAuthInit = () => {
      if (cancelled || hasInitialized) {
        return;
      }

      hasInitialized = true;

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (cancelled) {
            return;
          }

          syncAuthState(session);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          console.error("Error getting auth session:", error);
          syncAuthState(null);
        });

      try {
        subscription = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) {
            return;
          }

          if (event === "PASSWORD_RECOVERY") {
            if (!window.location.pathname.includes("/reset-password")) {
              window.location.href = "/reset-password";
            }
            return;
          }

          syncAuthState(session);

          if (event === "SIGNED_IN" && session?.user) {
            updateLastLogin(session.user.id);
            syncUserEmailToProfileTable(session.user.id, session.user.email);
          }

          if (event === "USER_UPDATED" && session?.user) {
            syncUserEmailToProfileTable(session.user.id, session.user.email);
          }
        }).data.subscription;
      } catch (error) {
        console.error("Error subscribing to auth state:", error);
        syncAuthState(null);
      }
    };

    const currentPath = window.location.pathname;
    const shouldDeferSessionBootstrap = ![
      /^\/dashboard/,
      /^\/creator/,
      /^\/checkout/,
      /^\/login/,
      /^\/register/,
      /^\/referral/,
      /^\/reset-password/,
      /^\/forgot-password/,
      /^\/auth/,
    ].some((pattern) => pattern.test(currentPath));

    if (shouldDeferSessionBootstrap) {
      const deferredInit = () => runAuthInit();
      const timeoutId = window.setTimeout(deferredInit, 1200);

      if (typeof window.requestIdleCallback === "function") {
        const idleId = window.requestIdleCallback(deferredInit, {
          timeout: 1500,
        });

        return () => {
          cancelled = true;
          window.clearTimeout(timeoutId);
          window.cancelIdleCallback?.(idleId);
          subscription?.unsubscribe();
        };
      }

      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
        subscription?.unsubscribe();
      };
    }

    runAuthInit();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: { full_name: string },
    redirectUrl?: string,
  ) => {
    setIsLoading(true);

    try {
      // The user metadata will be used by our database trigger to populate the users table
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectUrl || "/dashboard")}`,
          data: userData,
        },
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error signing up:", error);
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
      console.error("Error signing in:", error);
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
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, redirectUrl?: string) => {
    try {
      const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  };

  const changeEmail = async (email: string, redirectUrl?: string) => {
    try {
      const { error, data } = await supabase.auth.updateUser(
        {
          email,
        },
        {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectUrl || "/dashboard/user-settings")}`,
        },
      );

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error changing email:", error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      throw new Error("No user is currently logged in");
    }

    try {
      // Call the database function to delete the user account
      // This is a SECURITY DEFINER function that can delete from auth.users
      const { data, error } = await supabase.rpc("delete_user_account");

      if (error) throw error;

      // Check if the function returned success
      if (data && !data.success) {
        throw new Error(data.message || "Failed to delete account");
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        signUp,
        signIn,
        signOut,
        resetPassword,
        changeEmail,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  // During SSR/hydration, context might be temporarily undefined
  // Add a safety check to prevent hydration errors
  if (typeof window !== "undefined" && context === undefined) {
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
      changeEmail: async () => ({ success: false }),
      deleteAccount: async () => ({ success: false }),
    } as AuthContextType;
  }

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
