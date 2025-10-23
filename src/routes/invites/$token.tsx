import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'react-toastify'

export const Route = createFileRoute('/invites/$token')({
  component: InvitePage,
})

interface InviteData {
  household: {
    id: string
    name: string
    emoji: string | null
  }
  inviter: {
    full_name: string
    avatar_url: string | null
  }
  invite: {
    personal_message: string | null
  }
}

function InvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAccepted, setIsAccepted] = useState(false)

  // Validate invite on mount
  useEffect(() => {
    validateInvite()
  }, [token])

  // Handle auth redirect after validation
  useEffect(() => {
    if (!authLoading && !user && inviteData) {
      // Not authenticated but invite is valid - redirect to login
      const currentUrl = encodeURIComponent(window.location.pathname)
      navigate({
        to: '/login',
        search: { redirect: currentUrl },
      })
    }
  }, [authLoading, user, inviteData, navigate])

  const validateInvite = async () => {
    setIsValidating(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'households-validate-invite',
        {
          body: { token },
        }
      )

      if (error) throw error

      if (data.error) {
        setError(data.error)
        return
      }

      setInviteData(data)
    } catch (err: any) {
      console.error('Error validating invite:', err)
      setError(err.message || 'Failed to validate invitation. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!user) {
      // Should not happen due to redirect, but handle gracefully
      const currentUrl = encodeURIComponent(window.location.pathname)
      navigate({
        to: '/login',
        search: { redirect: currentUrl },
      })
      return
    }

    setIsAccepting(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'households-accept-invite',
        {
          body: { token },
        }
      )

      if (error) throw error

      if (data.error) {
        setError(data.error)
        return
      }

      // Success!
      setIsAccepted(true)
      toast.success(
        `Welcome to ${inviteData?.household.name || 'the household'}!`
      )
    } catch (err: any) {
      console.error('Error accepting invite:', err)
      setError(err.message || 'Failed to accept invitation. Please try again.')
      toast.error('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleOpenApp = () => {
    const deepLink = `moneko://households/join?token=${token}`
    window.location.href = deepLink

    // Fallback to app stores after a delay if app didn't open
    setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)

      if (isIOS) {
        window.location.href = 'https://apps.apple.com/app/moneko'
      } else if (isAndroid) {
        window.location.href =
          'https://play.google.com/store/apps/details?id=com.moneko.app'
      }
    }, 2000)
  }

  // Loading state
  if (isValidating || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isValidating ? 'Validating invitation...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  // Success state (after accepting)
  if (isAccepted && inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're In! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined{' '}
            <span className="font-semibold">
              {inviteData.household.emoji} {inviteData.household.name}
            </span>
          </p>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleOpenApp}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Open in Moneko App
            </button>

            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p className="mb-2">Don't have the app yet?</p>
            <div className="flex gap-3 justify-center">
              <a
                href="https://apps.apple.com/app/moneko"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                Download for iOS
              </a>
              <span>•</span>
              <a
                href="https://play.google.com/store/apps/details?id=com.moneko.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                Download for Android
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Confirmation state (before accepting)
  if (!inviteData) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">
            {inviteData.household.emoji || '🏠'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join {inviteData.household.name}
          </h1>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            {inviteData.inviter.avatar_url ? (
              <img
                src={inviteData.inviter.avatar_url}
                alt={inviteData.inviter.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-lg">
                  {inviteData.inviter.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Invited by</p>
              <p className="font-semibold text-gray-900">
                {inviteData.inviter.full_name}
              </p>
            </div>
          </div>

          {inviteData.invite.personal_message && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <p className="text-sm text-gray-600 italic">
                "{inviteData.invite.personal_message}"
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            What you can do together:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Track shared budgets and spending goals</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Split expenses fairly and easily</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Collaborate on financial decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Keep your privacy with fine-grained sharing controls</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAcceptInvite}
            disabled={isAccepting}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Joining...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Accept Invitation
              </>
            )}
          </button>

          <button
            onClick={() => navigate({ to: '/' })}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Decline
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By joining this household, you agree to share financial information
          according to your privacy settings.
        </p>
      </div>
    </div>
  )
}
