import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { DefaultCatchBoundary } from '@/components/DefaultCatchBoundary'
import { NotFound } from '@/components/NotFound'
import appCss from '@/styles/main.css?url'
import { seo } from '@/utils/seo'
import { getCanonicalUrl, getCanonicalPath, getRedirectMap } from '@/utils/canonical'
// Import ToastContainer dynamically to avoid SSR issues
import { lazy, Suspense } from 'react'
const ToastContainer = lazy(() => import('react-toastify').then(mod => ({
  default: mod.ToastContainer
})))
const ThemeSystemListener = lazy(() => import('../components/theme/theme-system-listener'))
import { AuthProvider } from '@/contexts/auth-context'
import { ChatProvider } from '@/contexts/chat-context'
import { ClientOnly } from '@/components/client-only'
import { GoogleTagManager } from '@/components/google-tag-manager'
import { MonekoOrganizationData, MonekoWebsiteData } from '@/components/seo/structured-data'
import { MonekoCriticalResources, PerformanceHints } from '@/components/seo/critical-resources'
import { ThemeInitScript } from '@/components/theme/theme-init-script'

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
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/logo512.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/logo192.png',
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

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Ensure theme is set before CSS loads to avoid FOUC and to switch shadcn tokens */}
        <ThemeInitScript />
        <PerformanceHints />
        <MonekoCriticalResources />
        <HeadContent />
        <MonekoOrganizationData />
        <MonekoWebsiteData />
      </head>
        <GoogleTagManager gtmId="G-KBNN5QXD4G" />
      
      <body className="h-screen">      
      <AuthProvider>
        <ChatProvider>
          {/* Use ClientOnly wrapper to prevent hydration mismatches */}
          <ClientOnly>
            <Suspense fallback={null}>
              {/* Listen for system theme changes and sync .dark when no explicit user override */}
              <ThemeSystemListener />
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
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <Scripts />
        </ChatProvider>
      </AuthProvider>
      </body>
    </html>
  )
}
