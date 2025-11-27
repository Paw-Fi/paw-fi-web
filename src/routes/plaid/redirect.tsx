import { useEffect, useMemo, useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const APP_SCHEME = 'moneko://plaid'

export const Route = createFileRoute('/plaid/redirect')({
  component: PlaidRedirectPage,
})

function PlaidRedirectPage() {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  const deepLink = useMemo(() => (params ? buildDeepLink(params) : APP_SCHEME), [params])
  const [manualNeeded, setManualNeeded] = useState(false)
  const [cooldown, setCooldown] = useState(5)

  const redirect = useCallback(() => {
    if (typeof window === 'undefined') return
    window.location.href = deepLink
  }, [deepLink])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setParams(collectPlaidParams())
  }, [])

  useEffect(() => {
    if (!params) return

    setCooldown(5)
    const countdown = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const timer = setTimeout(() => {
      try {
        redirect()
      } catch (error) {
        console.warn('[PlaidRedirect] Auto redirect failed', error)
        setManualNeeded(true)
      }
    }, 100)

    const fallback = setTimeout(() => setManualNeeded(true), 1500)
    return () => {
      clearTimeout(timer)
      clearTimeout(fallback)
      clearInterval(countdown)
    }
  }, [params, redirect])

  return (
    <main className="plaid-redirect-bg relative min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="absolute inset-0 pointer-events-none" aria-hidden />
      <div className="relative max-w-xl w-full bg-card/80 backdrop-blur rounded-2xl border border-border shadow-2xl shadow-primary/20 px-6 sm:px-10 py-10 text-center">
        <div className="plaid-redirect-spinner inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/15 text-primary mb-6">
          <svg
            className="h-6 w-6 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.364 6.364L16 16m-8 0-1.364 2.364M16 8l1.364-2.364M8 8 6.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">Finishing bank connection…</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          If you&apos;re not redirected automatically, use the button below.
        </p>
        <button
          type="button"
          onClick={redirect}
          disabled={!params || cooldown > 0}
          className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Return to Moneko (${cooldown})` : 'Return to Moneko'}
        </button>
        {manualNeeded && (
          <p className="mt-6 text-sm text-muted-foreground break-words">
            If this keeps happening, copy and open:
            <br />
            <code className="text-primary">{deepLink}</code>
          </p>
        )}
      </div>
    </main>
  )
}

function collectPlaidParams() {
  const query = new URLSearchParams(window.location.search)
  const hashString = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashString)

  const basePayload: Record<string, string> = {
    link_token: query.get('link_token') || hash.get('link_token') || '',
    oauth_state_id: query.get('oauth_state_id') || hash.get('oauth_state_id') || '',
    status: query.get('status') || hash.get('status') || '',
    error_code: query.get('error_code') || hash.get('error_code') || '',
    error_message: query.get('error_message') || hash.get('error_message') || '',
  }

  const params = new URLSearchParams()
  Object.entries(basePayload).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  // Forward any additional parameters Plaid might add in the future
  ;[query, hash].forEach((source) => {
    source.forEach((value, key) => {
      if (!params.has(key) && value) {
        params.set(key, value)
      }
    })
  })

  return params
}

function buildDeepLink(params: URLSearchParams) {
  const query = params.toString()
  return query ? `${APP_SCHEME}?${query}` : APP_SCHEME
}
