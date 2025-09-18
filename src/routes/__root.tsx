import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { DefaultCatchBoundary } from '@/components/DefaultCatchBoundary'
import { NotFound } from '@/components/NotFound'
import appCss from '@/styles/main.css?url'
import { seo } from '@/utils/seo'
import { getCanonicalUrl} from '@/utils/canonical'
// Import ToastContainer dynamically to avoid SSR issues
import { lazy, Suspense } from 'react'
const ToastContainer = lazy(() => import('react-toastify').then(mod => ({
  default: mod.ToastContainer
})))
import { AuthProvider } from '@/contexts/auth-context'
import { ChatProvider } from '@/contexts/chat-context'
import { AIChatProvider } from '@/contexts/ai-chat-context'
import { ClientOnly } from '@/components/client-only'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HelmetProvider } from '@dr.pogodin/react-helmet'
import { GoogleTagManager } from '@/components/google-tag-manager'
import { MonekoOrganizationData, MonekoWebsiteData } from '@/components/seo/structured-data'
import { MonekoCriticalResources, PerformanceHints } from '@/components/seo/critical-resources'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { useAuthQuerySync } from '@/hooks/use-auth-query-sync'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => {
    // Default canonical URL for the root page
    const pageUrl = getCanonicalUrl('/');
    
    return {
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title:
          'Moneko | Personal Finance Education & Budgeting Tools',
        description: `Learn personal finance with Moneko's comprehensive budgeting tools, calculators, and educational resources. Master money management with our expert-designed financial planning platform.`,
      }),
    ],
    links: [
      // Add canonical link to prevent duplicate content issues
      { rel: 'canonical', href: pageUrl },
      { rel: 'stylesheet', href: appCss },
      
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/logo192.png',  // Keep PNG for iOS compatibility
      },
      {
        rel: 'icon',
        type: 'image/webp',
        sizes: '192x192',
        href: '/logo192.webp',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/webp',
        sizes: '512x512',
        href: '/logo512.webp',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/logo512.png',
      },
      {
        rel: 'icon',
        type: 'image/webp',
        sizes: '32x32',
        href: '/logo192.webp',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/webp',
        sizes: '16x16',
        href: '/logo192.webp',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/logo192.png',
      },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'shortcut icon', href: '/favicon.ico' },
    ],
  };
  },
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    )
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

// Component to sync auth with query cache - must be inside AuthProvider
function AuthSyncWrapper({ children }: { children: React.ReactNode }) {
  // Re-enabled to fix Link navigation API fetching issue
  useAuthQuerySync();
  return <>{children}</>;
}

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Critical theme script - must run before any CSS to prevent FOUC */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var s='moneko-ui-theme',d=document.documentElement,l=localStorage.getItem(s),m=window.matchMedia('(prefers-color-scheme: dark)'),i=l?l==='dark':m.matches;d.classList.toggle('dark',i);d.style.colorScheme=i?'dark':'light';}catch(_){}})();`
        }} />
        <PerformanceHints />
        <MonekoCriticalResources />
        <HeadContent />
        <MonekoOrganizationData />
        <MonekoWebsiteData />
        <GoogleTagManager gtmId="G-KBNN5QXD4G" />
      </head>
      
      <body className="h-screen">      
        
      <HelmetProvider>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="moneko-ui-theme">
            <AuthProvider>
              <AIChatProvider>
                <ChatProvider>
                  <AuthSyncWrapper>
                  {/* Use ClientOnly wrapper to prevent hydration mismatches */}
                  <ClientOnly>
                    <Suspense fallback={null}>
                    <ToastContainer
                      position="top-right"
                      autoClose={5000}
                      hideProgressBar={false}
                      newestOnTop={false}
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="light"
                    />
                  </Suspense>
                </ClientOnly>
               {children}
                {/* <TanStackRouterDevtools position="bottom-right" />
                <ReactQueryDevtools buttonPosition="bottom-left" /> */}
                <Scripts />
                  </AuthSyncWrapper>
                </ChatProvider>
              </AIChatProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </HelmetProvider>
      </body>
    </html>
  )
}
