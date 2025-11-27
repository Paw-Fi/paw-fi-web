import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStandardQueryConfig } from '@/lib/query-config';

export interface HomepageTestimonial {
  id: string;
  name: string;
  quote: string;
  avatar_url?: string | null;
  rating?: number | null;
}

const fetchHomepageTestimonials = async (): Promise<HomepageTestimonial[]> => {
  const { data, error } = await supabase
    .from('homepage_testimonials')
    .select('id, name, quote, avatar_url, rating, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    quote: row.quote as string,
    avatar_url: (row as any).avatar_url ?? null,
    rating: (row as any).rating ?? null,
  }));
};

export function useHomepageTestimonials() {
  return useQuery({
    queryKey: ['homepage-testimonials'],
    queryFn: fetchHomepageTestimonials,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...getStandardQueryConfig(),
  });
}
