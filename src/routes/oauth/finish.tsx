import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface OAuthFinishSearch {
  request_id?: string;
  mcp_base_url?: string;
}

interface OAuthCompleteResponse {
  redirectUrl: string;
}

export const Route = createFileRoute('/oauth/finish')({
  component: OAuthFinish,
  validateSearch: (search: Record<string, unknown>): OAuthFinishSearch => {
    return {
      request_id: (search.request_id as string) || undefined,
      mcp_base_url: (search.mcp_base_url as string) || undefined,
    };
  },
});

export function OAuthFinish() {
  const { request_id, mcp_base_url } = Route.useSearch();
  const { session, isAuthenticated, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const accessToken = session?.access_token;

  const mcpBaseUrl = useMemo(() => {
    const candidate = (mcp_base_url || '').trim();
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return candidate.replace(/\/+$/, '');
    }
    return '';
  }, [mcp_base_url]);

  useEffect(() => {
    if (isLoading) return;
    if (!request_id) {
      setErrorMessage('Missing request_id. Please restart the connection flow from ChatGPT.');
      return;
    }

    if (!mcpBaseUrl) {
      setErrorMessage('Missing MCP server URL. Please restart the connection flow from ChatGPT.');
      return;
    }

    if (!isAuthenticated || !accessToken) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login/?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    let cancelled = false;
    async function complete() {
      try {
        setErrorMessage(null);
        const res = await fetch(`${mcpBaseUrl}/oauth/complete`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            request_id,
            access_token: accessToken,
          }),
        });

        const payload = (await res.json()) as Partial<OAuthCompleteResponse>;
        if (!res.ok) {
          throw new Error('Failed to complete authentication. Please try again.');
        }
        if (!payload.redirectUrl) {
          throw new Error('Missing redirect URL from server. Please try again.');
        }
        if (cancelled) return;
        window.location.assign(payload.redirectUrl);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
      }
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, isLoading, mcpBaseUrl, request_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-moneko-background px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="text-lg font-semibold text-moneko-foreground">Connecting Moneko…</div>
        <div className="mt-2 text-sm text-muted-foreground">
          {errorMessage ? 'Something went wrong.' : 'Finishing sign-in and returning you to ChatGPT.'}
        </div>
        {errorMessage ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
