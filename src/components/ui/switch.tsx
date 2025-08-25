import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

interface UISwitchProps
  extends Omit<
    React.ComponentProps<typeof SwitchPrimitive.Root>,
    "checked" | "defaultChecked" | "onCheckedChange" | "onToggle"
  > {
  labelLeft?: string
  labelRight?: string
  srText?: string
  initialToggled?: boolean
  onToggle?: (checked: boolean) => void
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({
  className,
  labelLeft,
  labelRight,
  srText,
  initialToggled,
  onToggle,
  checked: controlledChecked,
  onCheckedChange,
  ...props
}: UISwitchProps) {
  const isControlled = controlledChecked !== undefined
  const [internalChecked, setInternalChecked] = React.useState<boolean>(
    initialToggled ?? false
  )

  React.useEffect(() => {
    if (!isControlled && typeof initialToggled === "boolean") {
      setInternalChecked(initialToggled)
    }
  }, [initialToggled, isControlled])

  const checked = isControlled ? (controlledChecked as boolean) : internalChecked

  function handleChange(next: boolean) {
    if (!isControlled) setInternalChecked(next)
    onCheckedChange?.(next)
    onToggle?.(next)
  }

  return (
    <div className="inline-flex items-center gap-3">
      {labelLeft ? (
        <span className="text-sm text-muted-foreground">{labelLeft}</span>
      ) : null}
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        checked={checked}
        onCheckedChange={handleChange}
        aria-label={srText}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
      {labelRight ? (
        <span className="text-sm font-medium">{labelRight}</span>
      ) : null}
    </div>
  )
}

export { Switch }
