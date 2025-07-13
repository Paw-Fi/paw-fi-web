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
import { getCanonicalUrl } from '@/utils/canonical'
// Import ToastContainer dynamically to avoid SSR issues
import { lazy, Suspense } from 'react'
const ToastContainer = lazy(() => import('react-toastify').then(mod => ({
  default: mod.ToastContainer
})))
import { AuthProvider } from '@/contexts/auth-context'
import { ClientOnly } from '@/components/client-only'

const GTM_ID = 'G-KBNN5QXD4G';
const DATA_LAYER_NAME = 'dataLayer'; // You can make this an env variable if needed, but 'dataLayer' is standard


export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => {
    const pageUrl = getCanonicalUrl('/');

    // GTM initialization script content
    const gtmScriptContent = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='${DATA_LAYER_NAME}'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','${DATA_LAYER_NAME}','${GTM_ID}');
    `;

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
            'TanStack Start | Type-Safe, Client-First, Full-Stack React Framework',
          description: `TanStack Start is a type-safe, client-first, full-stack React framework. `,
        }),
      ],
      links: [
        { rel: 'canonical', href: pageUrl },
        { rel: 'stylesheet', href: appCss },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
        { rel: 'icon', href: '/favicon.ico' },
      ],
      // Add the GTM scripts here
      scripts: [
        {
          // The main GTM script
          dangerouslySetInnerHTML: { __html: gtmScriptContent },
        },
        {
          // The GTM <noscript> iframe
          tag: 'noscript', // Specify the tag type
          innerHTML: `
            <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>
          `,
        },
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
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      
      <body className="h-screen">
      <AuthProvider>
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
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </AuthProvider>
      </body>
    </html>
  )
}
