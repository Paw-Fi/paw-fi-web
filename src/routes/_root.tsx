import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_root')({
  component: RootLayout,
})

function RootLayout() {
  return (
    <main className="flex-1 bg-background">
      {/* Apply view-transition-name directly to enable view transitions */}
      <div className="[view-transition-name:main-content]">
        <Outlet />
      </div>
    </main>
  )
}
