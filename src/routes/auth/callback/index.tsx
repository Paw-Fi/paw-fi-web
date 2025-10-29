import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAvatar } from '@/hooks/use-avatar'

export const Route = createFileRoute('/auth/callback/')({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => {
    const next = search.next as string
    return {
      next: next ? decodeURIComponent(next) : '/dashboard',
    }
  },
})

function AuthCallback() {
  const navigate = useNavigate()
  const { next } = Route.useSearch()
  const { shouldPromptForAvatar } = useAvatar()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Prevent multiple executions
    if (isProcessing) return
    
    const handleAuthCallback = async () => {
      setIsProcessing(true)
      
      try {
        // Check for recovery type in URL (password reset flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        const type = hashParams.get('type') || queryParams.get('type')
        
        // If this is a password recovery flow, redirect to reset-password page
        if (type === 'recovery') {
          navigate({ to: '/reset-password' })
          return
        }
        
        // Check if we have a session - Supabase handles OAuth exchange automatically
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          navigate({ 
            to: '/login', 
            search: { 
              redirect: next,
              error: 'Authentication failed. Please try again.'
            }
          })
          return
        }

        if (session) {
          // OAuth authentication successful - proceed with user flow
          const needsAvatar = await shouldPromptForAvatar()
          
          if (needsAvatar) {
            // CRITICAL FIX: Preserve redirect URL when going to avatar customizer
            navigate({ 
              to: '/avatar-customizer',
              search: next && next !== '/dashboard' ? { redirect: next } : undefined
            })
          } else {
            navigate({ to: next })
          }
        } else {
          // No immediate session - this is normal for OAuth flow
          // Supabase Auth handles session creation via URL fragments/parameters
          // Give a brief moment for Supabase to process the authentication
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              const needsAvatar = await shouldPromptForAvatar()
              
              if (needsAvatar) {
                // CRITICAL FIX: Preserve redirect URL when going to avatar customizer
                navigate({ 
                  to: '/avatar-customizer',
                  search: next && next !== '/dashboard' ? { redirect: next } : undefined
                })
              } else {
                navigate({ to: next })
              }
            } else {
              // Session establishment failed
              navigate({ 
                to: '/login', 
                search: { 
                  redirect: next,
                  error: 'Authentication session could not be established'
                }
              })
            }
          }, 1000)
        }
      } catch (error) {
        console.error('OAuth callback processing error:', error)
        navigate({ 
          to: '/login', 
          search: { 
            redirect: next,
            error: 'An unexpected error occurred during authentication'
          }
        })
      }
    }

    // Process callback immediately
    handleAuthCallback()
  }, [navigate, next, shouldPromptForAvatar, isProcessing])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}

export default AuthCallback