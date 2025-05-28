import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import TanstackQueryLayout from '../integrations/tanstack-query/layout'
import PageLayout from '../components/layout/page-layout'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <HeadContent />
        <PageLayout />
        <TanstackQueryLayout />
        <TanStackRouterDevtools />
      <Scripts />
    </>
  ),
  head: () => ({
    title: 'PawFi - Your Financial Companion',
    meta: [
      {
        name: 'description',
        content: 'PawFi helps you manage your finances with powerful tools and calculators for investments, mortgages, savings, and more.',
      },
      {
        name: 'keywords',
        content: 'pawfi, finance, personal finance, financial calculators, investment calculator, mortgage calculator, savings calculator, retirement planning, auto loan',
      },
      { property: 'og:title', content: 'PawFi - Your Financial Companion' },
      { property: 'og:description', content: 'Powerful financial tools and calculators at your fingertips.' },
      // { property: 'og:image', content: 'https://pawfi.app/og-image.png' }, // Replace with your actual OG image URL
      // { property: 'og:url', content: 'https://pawfi.app' }, // Replace with your actual site URL
      // { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
    ],
  }),
  // Example for global body scripts if needed for SPA
  // scripts: () => [
  //   {
  //     children: 'console.log("Global body script from root route loaded!")',
  //   },
  // ],
})
