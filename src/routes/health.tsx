import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  component: HealthComponent,
  loader: async () => {
    // Simple health check data
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  },
})

function HealthComponent() {
  const data = Route.useLoaderData()
  
  return (
    <div style={{ fontFamily: 'monospace', padding: '20px' }}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}