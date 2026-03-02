import { redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export interface CreatorUserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_creator: boolean
}

interface GuardResult {
  creatorUser: CreatorUserProfile
}

export async function requireCreatorUser(locationHref?: string): Promise<GuardResult> {
  if (typeof window === 'undefined') {
    throw redirect({
      to: '/login',
      search: {
        redirect: locationHref,
      },
    })
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Creator guard: unable to fetch session', error)
  }

  if (!session?.user) {
    throw redirect({
      to: '/login',
      search: {
        redirect: locationHref ?? window.location.href,
      },
    })
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, is_creator')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Creator guard: failed loading profile', profileError)
    throw redirect({
      to: '/dashboard',
      search: { notice: 'creator_access_error' },
    })
  }

  if (!profile?.is_creator) {
    throw redirect({
      to: '/dashboard',
      search: { notice: 'creator_only' },
    })
  }

  return { creatorUser: profile }
}
