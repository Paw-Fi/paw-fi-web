import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success:
          "border-success/50 text-success bg-success-light dark:bg-success/10 dark:border-success/50 [&>svg]:text-success",
        warning:
          "border-warning/50 text-warning bg-warning-light dark:bg-warning/10 dark:border-warning/50 [&>svg]:text-warning",
        info:
          "border-primary/50 text-primary bg-primary/5 [&>svg]:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface MonekoAlertProps extends VariantProps<typeof alertVariants> {
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ReactNode
}

export function MonekoAlert({
  variant = "default",
  children,
  className,
  title,
  icon,
  ...props
}: MonekoAlertProps) {
  return (
    <Alert className={cn(alertVariants({ variant }), className)} {...props}>
      {icon && icon}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

// Default icons for each variant
export function SuccessAlert({ children, title, className, ...props }: Omit<MonekoAlertProps, 'variant' | 'icon'>) {
  return (
    <MonekoAlert
      variant="success"
      className={className}
      title={title}
      icon={
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      }
      {...props}
    >
      {children}
    </MonekoAlert>
  )
}

export function WarningAlert({ children, title, className, ...props }: Omit<MonekoAlertProps, 'variant' | 'icon'>) {
  return (
    <MonekoAlert
      variant="warning"
      className={className}
      title={title}
      icon={
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      }
      {...props}
    >
      {children}
    </MonekoAlert>
  )
}

export function InfoAlert({ children, title, className, ...props }: Omit<MonekoAlertProps, 'variant' | 'icon'>) {
  return (
    <MonekoAlert
      variant="info"
      className={className}
      title={title}
      icon={
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      }
      {...props}
    >
      {children}
    </MonekoAlert>
  )
}

export { MonekoAlert as EnhancedAlert }