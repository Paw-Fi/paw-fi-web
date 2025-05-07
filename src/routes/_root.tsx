import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_root')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_root"!</div>
}
