import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-xl border border-subtle-border bg-input-bg text-moneko-foreground px-4 py-1.5 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-moneko-foreground placeholder:text-muted-foreground-color focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm",
          {
            "bg-input-disabled text-muted-foreground-color cursor-not-allowed": props.disabled,
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
