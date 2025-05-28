import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// --- Types ---
import type { Course } from '../types/learning.types';

// --- RAW ASYNC FUNCTION ---
export async function getUserCourses(userId: string): Promise<Course[]> {
  const { data, error } = await supabase.functions.invoke('get-user-courses', {
    method: 'POST',
    body: { userId },
  });
  if (error) throw error;
  return data.courses as Course[];
}

// --- TANSTACK QUERY HOOK ---
export function useUserCourses(userId: string, options?: { enabled?: boolean }) {
  return useQuery<Course[]>({
    queryKey: ['user-courses', userId],
    queryFn: async () => getUserCourses(userId),
    enabled: !!userId && (options?.enabled ?? true),
  });
}
