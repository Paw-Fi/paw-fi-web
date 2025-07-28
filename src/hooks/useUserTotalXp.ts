import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Function to fetch user's total XP
const fetchUserTotalXp = async (userId: string): Promise<number> => {
  if (!userId) return 0

  const { data, error } = await supabase.functions.invoke('get-user-xp', {   
    body: { user_id: userId }
  })

  if (error) {
    throw new Error(`Failed to fetch user XP: ${error.message}`)
  }

  return data?.total_xp || 0
}

export function useUserTotalXp(userId: string | undefined) {
  return useQuery({
    queryKey: ['userTotalXp', userId],
    queryFn: () => fetchUserTotalXp(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 3,
    select: (data) => data || 0
  })
}