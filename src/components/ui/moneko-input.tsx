import React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface MonekoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  error?: string
  helperText?: string
  label?: string
  required?: boolean
}

export function MonekoInput({
  prefix,
  suffix,
  error,
  helperText,
  label,
  required,
  className,
  id,
  ...props
}: MonekoInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium leading-none",
            hasError ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Prefix */}
        {prefix && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {typeof prefix === 'string' ? (
              <span className="text-sm">{prefix}</span>
            ) : (
              prefix
            )}
          </div>
        )}

        {/* Input */}
        <Input
          id={inputId}
          className={cn(
            // Add padding for prefix/suffix
            prefix && "pl-10",
            suffix && "pr-10",
            // Error styling
            hasError && "border-destructive focus:border-destructive focus:ring-destructive",
            className
          )}
          {...props}
        />

        {/* Suffix */}
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {typeof suffix === 'string' ? (
              <span className="text-sm">{suffix}</span>
            ) : (
              suffix
            )}
          </div>
        )}
      </div>

      {/* Helper Text / Error Message */}
      {(error || helperText) && (
        <p
          className={cn(
            "text-sm",
            hasError ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}

// Common prefix icons as utility components
export function DollarPrefix() {
  return <span className="text-sm font-medium">$</span>
}

export function EuroPrefix() {
  return <span className="text-sm font-medium">€</span>
}

export function PercentagePrefix() {
  return <span className="text-sm font-medium">%</span>
}

export function SearchPrefix() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export function EmailPrefix() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
  )
}

export { MonekoInput as EnhancedInput }