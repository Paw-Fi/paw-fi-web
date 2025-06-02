import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Get environment variables with fallbacks for different environments
const getEnvVariable = (key: string): string => {
  // For client-side in Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || process.env[key] || '';
  }
  // For server-side
  return process.env[key] || '';
};

const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY');

// Validate that we have the required environment variables
if (!supabaseUrl || supabaseUrl.includes('${') || !supabaseAnonKey || supabaseAnonKey.includes('${')) {
  console.error('Missing or invalid Supabase environment variables');
}

// Create a safe version of createClient that validates inputs first
const createSafeClient = () => {
  try {
    // Validate URL format before creating client
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('${') || supabaseAnonKey.includes('${')) {
      console.error('Invalid Supabase credentials. Check environment variables.');
      // Return a dummy client that won't crash but will log errors
      return {
        auth: { onAuthStateChange: () => ({ data: null, error: new Error('Invalid credentials') }) },
        from: () => ({ select: () => Promise.resolve({ data: null, error: new Error('Invalid credentials') }) })
      } as any;
    }
    
    // Only create the client if we have valid credentials
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    });
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return a dummy client that won't crash but will log errors
    return {
      auth: { onAuthStateChange: () => ({ data: null, error }) },
      from: () => ({ select: () => Promise.resolve({ data: null, error }) })
    } as any;
  }
};

export const supabase = createSafeClient();