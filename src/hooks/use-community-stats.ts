import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStandardQueryConfig } from '@/lib/query-config';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface CommunityStats {
  totalUsers: number;
  displayUsers: User[];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const fetchCommunityStats = async (): Promise<CommunityStats> => {
  // Fetch total user count
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Fetch 20 latest users
  const { data: latestUsers } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch all users to pick 20 random ones (excluding the latest 20)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, created_at');

  // Process users: combine latest 20 + random 20 (excluding latest)
  const latestUserIds = new Set(latestUsers?.map((u) => u.id) || []);
  const otherUsers = (allUsers || []).filter((u) => !latestUserIds.has(u.id));
  const shuffledOthers = shuffleArray(otherUsers);
  const randomUsers = shuffledOthers.slice(0, 20);

  // Combine latest 20 and random 20 users (total 40)
  const combined = [...(latestUsers || []), ...randomUsers];

  // Shuffle the combined array for variety in the marquee
  const displayUsers = shuffleArray(combined);

  return {
    totalUsers: count || 0,
    displayUsers,
  };
};

export function useCommunityStats() {
  return useQuery({
    queryKey: ['community-stats'],
    queryFn: fetchCommunityStats,
    staleTime: 5 * 60 * 1000, // 5 minutes - community stats don't change rapidly
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    ...getStandardQueryConfig(), // Use app's retry config for Edge Function cold starts
  });
}
