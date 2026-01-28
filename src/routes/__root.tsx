import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import * as React from 'react'
import { DefaultCatchBoundary } from '@/components/DefaultCatchBoundary'
import { NotFound } from '@/components/NotFound'
import appCss from '@/styles/main.css?url'
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
import { MonekoCriticalResources, PerformanceHints } from '@/components/seo/critical-resources'
import { MonekoOrganizationData, MonekoWebsiteData } from '@/components/seo/structured-data'
import { Theme as RadixTheme } from '@radix-ui/themes'
import { useAuthQuerySync } from '@/hooks/use-auth-query-sync'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReduxProvider } from '@/providers/ReduxProvider'
import { getQueryClient } from '@/lib/query-client'

export const Route = createRootRoute({
  head: () => {
    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
      links: [
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
    }
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

// Client-only component to run auth/query sync effects without SSR
function AuthSyncClientOnly() {
  useAuthQuerySync();
  return null;
}

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Get the properly configured QueryClient with SSR support
  // Server: creates a new client for each request (prevents data leakage)
  // Browser: reuses the same client instance (maintains cache across navigations)
  const queryClient = getQueryClient()
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PerformanceHints />
        <MonekoCriticalResources />
        <HeadContent />
        <MonekoOrganizationData />
        <MonekoWebsiteData />
      </head>
      
      <body className="min-h-screen">      
        
      {/* Google Analytics - must be in body with ClientOnly for react-ga4 */}
      <ClientOnly>
        <GoogleTagManager gtmId="G-KBNN5QXD4G" />
      </ClientOnly>
        
      <HelmetProvider>
        <ErrorBoundary>
          <RadixTheme
            accentColor="purple"
            grayColor="slate"
            panelBackground="solid"
            radius="medium"
            scaling="100%"
          >
            <ReduxProvider>
              <AuthProvider>
                <AIChatProvider>
                  <ChatProvider>
                    <QueryClientProvider client={queryClient}>
                  {/* Run auth/query sync only on the client to avoid SSR requiring QueryClient */}
                  <ClientOnly>
                    <AuthSyncClientOnly />
                  </ClientOnly>

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
                    {/* <TanStackRouterDevtools position="bottom-right" /> */}
                    {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
                    <Scripts />
                    </QueryClientProvider>
                  </ChatProvider>
                </AIChatProvider>
              </AuthProvider>
              </ReduxProvider>
          </RadixTheme>
        </ErrorBoundary>
      </HelmetProvider>
      </body>
    </html>
  )
}
