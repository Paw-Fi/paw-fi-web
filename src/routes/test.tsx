import AmbientHalo from '@/components/ui/ambient-halo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AmbientHalo />
}
