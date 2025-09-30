import * as React from "react"
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"
import { cn } from "@/lib/utils"
import { MinusIcon } from "@radix-ui/react-icons"

// ===============================
// InputOTP Component
// ===============================
const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>((props, ref) => {
  const { className, containerClassName, inputMode, pattern, ...rest } = props

  return (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed focus-visible:ring-0", className)}
      inputMode={inputMode ?? "numeric"}
      pattern={pattern ?? REGEXP_ONLY_DIGITS}
      // Reduce chance of password managers interfering
      pushPasswordManagerStrategy="none"
      data-lpignore="true"
      data-1p-ignore="true"
      {...rest}
    />
  )
})
InputOTP.displayName = "InputOTP"

// ===============================
// InputOTPGroup Component
// ===============================
const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

// ===============================
// InputOTPSlot Component
// ===============================
interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number
}

const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(
  ({ index, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext)

    // Extra safety: Ensure index exists in slots
    const slot = inputOTPContext?.slots?.[index]
    const char = slot?.char ?? ""
    const hasFakeCaret = slot?.hasFakeCaret ?? false
    const isActive = slot?.isActive ?? false

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center border-y border-r border-subtle-border bg-input-bg text-moneko-foreground text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
          isActive && "z-10 ring-1 ring-moneko-primary",
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-px animate-caret-blink bg-moneko-foreground duration-1000" />
          </div>
        )}
      </div>
    )
  }
)
InputOTPSlot.displayName = "InputOTPSlot"

// ===============================
// InputOTPSeparator Component
// ===============================
const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <MinusIcon />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

// ===============================
// Exports
// ===============================
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }