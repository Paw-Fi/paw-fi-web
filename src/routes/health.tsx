import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  component: () => null,
  loader: async () => {
    // Simple health check - return 200 OK
    return new Response(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  },
})