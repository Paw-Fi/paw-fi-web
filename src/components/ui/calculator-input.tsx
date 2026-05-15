"use client"

import * as React from "react"
import { Calculator } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CalculatorKeypad } from "@/components/ui/calculator-keypad"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CalculatorInputProps {
  value?: number
  onChange?: (value: number) => void
  placeholder?: string
  label?: string
  className?: string
  error?: string
  required?: boolean
}

export function CalculatorInput({
  value,
  onChange,
  placeholder = "0.00",
  label,
  className,
  error,
  required,
}: CalculatorInputProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [displayValue, setDisplayValue] = React.useState(value?.toString() || "")

  React.useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(value.toString())
    }
  }, [value])

  const handleConfirm = (val: string) => {
    const num = parseFloat(val) || 0
    setDisplayValue(num.toString())
    onChange?.(num)
    setIsOpen(false)
  }

  const handleKeypadChange = (val: string) => {
    setDisplayValue(val)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="relative cursor-pointer">
            <Input
              value={displayValue ? Number(displayValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ""}
              placeholder={placeholder}
              readOnly
              className={cn(
                "cursor-pointer pr-10 font-medium text-lg h-12",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          </div>
        </SheetTrigger>
        <SheetContent side="bottom" className="p-0 border-none bg-transparent shadow-none h-auto sm:max-w-md sm:mx-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Calculator Keypad</SheetTitle>
          </SheetHeader>
          <CalculatorKeypad 
            initialValue={displayValue}
            onValueChange={handleKeypadChange}
            onConfirm={handleConfirm}
          />
        </SheetContent>
      </Sheet>

      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
