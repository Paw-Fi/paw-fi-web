import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Add type declaration for window.__ENV__
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// Get environment variables with fallbacks for different environments
const getEnvVariable = (key: string): string => {
  // For client-side in Vite
  if (typeof window !== 'undefined') {
    // In browser environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = import.meta.env[key];
      if (value && typeof value === 'string' && !value.includes('${')) {
        return value;
      }
    }
    
    // Try window.__ENV__ if it exists (sometimes used for runtime injection)
    if (window.__ENV__ && window.__ENV__[key]) {
      return window.__ENV__[key];
    }
  } else {
    // Server-side environment
    if (typeof process !== 'undefined' && process.env) {
      // Try both the original key and alternatives
      const value = process.env[key] || 
                   (key === 'VITE_SUPABASE_URL' ? process.env.SUPABASE_URL : '') || 
                   (key === 'VITE_SUPABASE_ANON_KEY' ? process.env.SUPABASE_ANON_KEY : '');
      
      if (value && typeof value === 'string' && !value.includes('${')) {
        return value;
      }
    }
  }
  
  // Hardcoded fallbacks as absolute last resort
  // These should match the values in your production environment
  if (key === 'VITE_SUPABASE_URL') {
    return 'https://pbopcsmrcykdzbilpilf.supabase.co';
  }
  if (key === 'VITE_SUPABASE_ANON_KEY') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBib3Bjc21yY3lrZHpiaWxwaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxODczMzAsImV4cCI6MjA1OTc2MzMzMH0.oPnodbMGz5seQf-pHIP8gtanD62d-mhRjvhRhPDYPzA';
  }
  
  return '';
};

// Get Supabase credentials
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY');

// Validate that we have the required environment variables
if (!supabaseUrl || supabaseUrl.includes('${') || !supabaseAnonKey || supabaseAnonKey.includes('${')) {
  console.error('Missing or invalid Supabase environment variables');
}

// Global singleton to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

// Create a safe version of createClient that validates inputs first and ensures singleton
const createSafeClient = () => {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    // Validate URL format before creating client
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('${') || supabaseAnonKey.includes('${')) {
      console.error('Invalid Supabase credentials. Check environment variables.');
      // Return a dummy client that won't crash but will log errors
      const dummyClient = {
        auth: { onAuthStateChange: () => ({ data: null, error: new Error('Invalid credentials') }) },
        from: () => ({ select: () => Promise.resolve({ data: null, error: new Error('Invalid credentials') }) })
      } as any;
      supabaseInstance = dummyClient;
      return dummyClient;
    }
    
    // Only create the client if we have valid credentials
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Add storage key to prevent conflicts between multiple apps
        storageKey: 'moneko-supabase-auth-token',
      }
      // Removed global Content-Type header to allow proper MIME types for file uploads
    });
    
    return supabaseInstance;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return a dummy client that won't crash but will log errors
    const errorClient = {
      auth: { onAuthStateChange: () => ({ data: null, error }) },
      from: () => ({ select: () => Promise.resolve({ data: null, error }) })
    } as any;
    supabaseInstance = errorClient;
    return errorClient;
  }
};

export const supabase = createSafeClient();