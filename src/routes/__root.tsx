import { createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import TanstackQueryLayout from '../integrations/tanstack-query/layout'
import PageLayout from '../components/layout/page-layout'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <div className="flex flex-col h-screen">
      <PageLayout />
      <TanStackRouterDevtools />
      <TanstackQueryLayout />
    </div>
  ),
})
