import { useEffect, useMemo, useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const APP_SCHEME = 'moneko://plaid'

export const Route = createFileRoute('/plaid/redirect')({
  component: PlaidRedirectPage,
})

function PlaidRedirectPage() {
  const params = useMemo(() => collectPlaidParams(), [])
  const deepLink = useMemo(() => buildDeepLink(params), [params])
  const [manualNeeded, setManualNeeded] = useState(false)

  const redirect = useCallback(() => {
    window.location.href = deepLink
  }, [deepLink])

  useEffect(() => {
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
    }
  }, [redirect])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-4">Finishing bank connection…</h1>
      <p className="max-w-lg text-slate-300 mb-8">
        We&apos;re sending you back to the Moneko app with your Plaid status. If you&apos;re
        not redirected automatically, tap the button below.
      </p>
      <button
        type="button"
        onClick={redirect}
        className="px-6 py-3 rounded-full bg-emerald-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-300"
      >
        Return to Moneko
      </button>
      {manualNeeded && (
        <p className="mt-6 text-sm text-slate-400 break-words">
          If this keeps happening, copy and open: <br />
          <code className="text-emerald-300">{deepLink}</code>
        </p>
      )}
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

