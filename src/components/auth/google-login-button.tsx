"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSpinner } from "@fortawesome/free-solid-svg-icons"
import { faGoogle } from "@fortawesome/free-brands-svg-icons"

interface GoogleLoginButtonProps {
  redirectUrl?: string
  className?: string
  disabled?: boolean
}

export function GoogleLoginButton({ 
  redirectUrl, 
  className = "w-full",
  disabled = false
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Use built-in Supabase OAuth callback - no custom Edge Function needed
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl || '/dashboard')}`
      
      
      // OAuth with built-in Supabase callback - following official docs exactly
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          // Essential OAuth scopes for Google authentication:
          // - 'userinfo.email': Required to retrieve the user's email address
          // - 'userinfo.profile': Provides access to basic profile info (name, avatar)
          // - 'openid': Standard OpenID Connect scope for authentication
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          // Query parameters for enhanced compatibility:
          // - 'access_type: offline': Enables refresh token for long-term access
          // - 'prompt: consent': Forces consent screen for Google Workspace users
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error

      // signInWithOAuth handles redirect to built-in Supabase callback, then to our app
    } catch (error: any) {
      console.error('Google login error:', error)
      setError(error.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
    // Don't set loading to false - the page will redirect
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isLoading || disabled}
        className={className}
      >
        {isLoading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
            Signing in with Google...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faGoogle} className="mr-2 h-4 w-4" />
            Continue with Google
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}