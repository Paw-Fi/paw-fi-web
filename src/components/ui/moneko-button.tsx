import React from "react"
import { Link } from "@tanstack/react-router"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MonekoButtonProps extends Omit<ButtonProps, 'asChild'> {
  // Router integration props
  as?: 'button' | 'link'
  to?: string
  href?: string
  target?: string
  rel?: string
  
  // Additional navigation options
  replace?: boolean
  search?: Record<string, unknown>
  hash?: string
  
  // Loading state
  loading?: boolean
  loadingText?: string
}

export function MonekoButton({
  as = 'button',
  to,
  href,
  target,
  rel,
  replace,
  search,
  hash,
  loading = false,
  loadingText = "Loading...",
  disabled,
  children,
  className,
  ...props
}: MonekoButtonProps) {
  // Handle loading state
  const isDisabled = disabled || loading

  // For external links or regular anchor tags
  if (as === 'link' && href && !to) {
    return (
      <Button
        asChild
        disabled={isDisabled}
        className={cn(loading && "cursor-not-allowed", className)}
        {...props}
      >
        <a
          href={href}
          target={target}
          rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
        >
          {loading ? loadingText : children}
        </a>
      </Button>
    )
  }

  // For TanStack Router navigation
  if (as === 'link' && to) {
    return (
      <Button
        asChild
        disabled={isDisabled}
        className={cn(loading && "cursor-not-allowed", className)}
        {...props}
      >
        <Link
          to={to}
          replace={replace}
          search={search}
          hash={hash}
        >
          {loading ? loadingText : children}
        </Link>
      </Button>
    )
  }

  // Regular button
  return (
    <Button
      disabled={isDisabled}
      className={cn(loading && "cursor-not-allowed", className)}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  )
}

export { MonekoButton as EnhancedButton }