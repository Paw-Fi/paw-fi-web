import { useEffect } from 'react'
import { useNavigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/3rd-party-confirm/')({
  component: AuthConfirm,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      next: (search.next as string) || '/dashboard',
    }
  },
})

function AuthConfirm() {
  const navigate = useNavigate()
  const { next } = Route.useSearch()

  useEffect(() => {
    // This route is deprecated - redirect to the main auth callback
    navigate({ 
      to: '/auth/callback',
      search: { next },
      replace: true
    })
  }, [navigate, next])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}

export default AuthConfirm