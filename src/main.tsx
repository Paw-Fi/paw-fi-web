import { StrictMode } from 'react'
import "@styles/main.css";
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Import GSAP configuration with plugins registered
import './lib/gsap-config'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import reportWebVitals from './reportWebVitals.ts'
import { QuestionnaireProvider } from './contexts/questionnaire-context.tsx'

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    ...TanstackQuery.getContext(),
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  
  // Enable view transitions by default
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      // If coming from nowhere (initial load), use fade
      if (!fromLocation) return ['fade'];
      
      // Get indices to determine direction for back/forward navigation
      const fromPathDepth = fromLocation.pathname.split('/').filter(Boolean).length;
      const toPathDepth = toLocation.pathname.split('/').filter(Boolean).length;
      
      // Determine direction based on path depth for intuitive transitions
      if (fromPathDepth < toPathDepth) {
        // Going deeper in the navigation - slide left
        return ['slide-left'];
      } else if (fromPathDepth > toPathDepth) {
        // Going back up in the navigation - slide right
        return ['slide-right'];
      }
      
      // Same level navigation - use fade
      return ['fade'];
    },
  }
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <TanstackQuery.Provider>
        <QuestionnaireProvider>
          <ToastContainer 
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <RouterProvider router={router} />
        </QuestionnaireProvider>
      </TanstackQuery.Provider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
