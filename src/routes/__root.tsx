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
        
        {/* Pure CSS loading screen styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            #moneko-initial-loader {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              opacity: 1;
              transition: opacity 0.5s ease-out, visibility 0.5s ease-out;
            }
            
            #moneko-initial-loader.hidden {
              opacity: 0;
              visibility: hidden;
            }
            
            .moneko-loader-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            
            .moneko-logo {
              width: 60px;
              height: 60px;
              background: #7458FF;
              border-radius: 50%;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              color: white;
              animation: pulse 2s infinite ease-in-out;
            }
            
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            
            .moneko-loader-title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 8px;
              color: #1f2937;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .moneko-loader-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 24px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
          `
        }} />
      </head>
        <GoogleTagManager gtmId="G-KBNN5QXD4G" />
      
      <body className="h-screen">      
        {/* Pure HTML/CSS Loading Screen */}
        <div id="moneko-initial-loader">
          <div className="moneko-loader-content">
            <div className="moneko-logo">M</div>
            <div className="moneko-loader-title">Moneko</div>
            <div className="moneko-loader-subtitle">Initializing your financial journey...</div>
          </div>
        </div>

        {/* Hide loading screen once React hydrates */}
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('DOMContentLoaded', function() {
              // Additional safety: hide after a maximum timeout
              setTimeout(function() {
                const loader = document.getElementById('moneko-initial-loader');
                if (loader) {
                  loader.classList.add('hidden');
                  setTimeout(function() {
                    loader.remove();
                  }, 500);
                }
              }, 8000); // 8 second max timeout
            });

            // Hide when React has mounted (more reliable)
            document.addEventListener('DOMContentLoaded', function() {
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.addedNodes.length > 0) {
                    // Check if React router has mounted by looking for data-reactroot or router elements
                    const reactMounted = document.querySelector('[data-reactroot], [data-tanstack-router]') ||
                                       document.querySelector('main, nav, header') ||
                                       document.documentElement.hasAttribute('data-react-hydrated');
                    
                    if (reactMounted) {
                      const loader = document.getElementById('moneko-initial-loader');
                      if (loader) {
                        loader.classList.add('hidden');
                        setTimeout(function() {
                          loader.remove();
                        }, 500);
                      }
                      observer.disconnect();
                    }
                  }
                });
              });
              
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
            });
          `
        }} />
        
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
