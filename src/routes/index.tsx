import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redirect to the intro page
    throw redirect({ to: '/intro' })
  },
  component: App,
})

function App() {
  // This won't actually render due to the redirect
  return null
}
