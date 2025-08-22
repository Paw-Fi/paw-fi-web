import React from "react"
import { useRouter } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StructuredData } from "@/components/seo/structured-data"
import { cn } from "@/lib/utils"

interface BreadcrumbItemData {
  name: string
  url: string
  isCurrentPage?: boolean
}

interface MonekoBreadcrumbProps {
  items: BreadcrumbItemData[]
  className?: string
  showBackButton?: boolean
  maxItems?: number
  generateSEO?: boolean // Whether to generate SEO structured data
}

export function MonekoBreadcrumb({
  items,
  className,
  showBackButton = true,
  maxItems,
  generateSEO = true,
}: MonekoBreadcrumbProps) {
  const router = useRouter()

  const handleGoBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      router.history.back()
    } else {
      // Fallback: navigate to parent path or home
      const currentPath = window.location.pathname
      const pathSegments = currentPath.split('/').filter(Boolean)
      
      if (pathSegments.length > 1) {
        // Navigate to parent path
        const parentPath = '/' + pathSegments.slice(0, -1).join('/')
        router.navigate({ to: parentPath })
      } else {
        // Navigate to home
        router.navigate({ to: '/' })
      }
    }
  }

  // Process items for display
  let displayItems = [...items]
  let showEllipsis = false

  if (maxItems && items.length > maxItems) {
    showEllipsis = true
    // Show first item, ellipsis, and last few items
    const lastItems = items.slice(-(maxItems - 1))
    displayItems = [items[0], ...lastItems]
  }

  // Prepare data for SEO structured data
  const seoItems = items.map(item => ({
    name: item.name,
    url: item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`
  }))

  return (
    <>
      {/* SEO Structured Data */}
      {generateSEO && items.length > 0 && (
        <StructuredData type="breadcrumb" data={seoItems} />
      )}

      <div className={cn("flex items-center space-x-2", className)}>
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={handleGoBack}
            className="mr-2 p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Go back"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            {displayItems.map((item, index) => (
              <React.Fragment key={`${item.url}-${index}`}>
                {/* Show ellipsis after first item if needed */}
                {showEllipsis && index === 1 && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbEllipsis className="h-4 w-4" />
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}

                <BreadcrumbItem>
                  {item.isCurrentPage || index === displayItems.length - 1 ? (
                    <BreadcrumbPage>{item.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.url}>
                      {item.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>

                {/* Add separator if not last item */}
                {index < displayItems.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </>
  )
}

export { MonekoBreadcrumb as EnhancedBreadcrumb }