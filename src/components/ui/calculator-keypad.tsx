"use client"

import * as React from "react"
import { Delete, Check, Plus, Minus, X, Divide, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CalculatorKeypadProps {
  onValueChange?: (value: string) => void
  onConfirm: (value: string) => void
  initialValue?: string
  className?: string
}

export function CalculatorKeypad({
  onValueChange,
  onConfirm,
  initialValue = "0",
  className,
}: CalculatorKeypadProps) {
  const [display, setDisplay] = React.useState(initialValue === "0" ? "" : initialValue)
  const [lastValue, setLastValue] = React.useState<string | null>(null)
  const [operation, setOperation] = React.useState<string | null>(null)
  const [shouldResetDisplay, setShouldResetDisplay] = React.useState(false)

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case "+": return first + second
      case "-": return first - second
      case "×": return first * second
      case "÷": return second !== 0 ? first / second : 0
      default: return second
    }
  }

  const formatNumber = (num: string) => {
    if (!num) return "0"
    // Remove leading zeros unless it's "0."
    if (num.startsWith("0") && num.length > 1 && num[1] !== ".") {
      return num.substring(1)
    }
    return num
  }

  const handleKeyPress = (key: string) => {
    let newDisplay = display

    if (/[0-9]/.test(key)) {
      if (shouldResetDisplay) {
        newDisplay = key
        setShouldResetDisplay(false)
      } else {
        newDisplay = display === "0" ? key : display + key
      }
    } else if (key === ".") {
      if (shouldResetDisplay) {
        newDisplay = "0."
        setShouldResetDisplay(false)
      } else if (!display.includes(".")) {
        newDisplay = (display || "0") + "."
      }
    } else if (key === "AC") {
      newDisplay = ""
      setLastValue(null)
      setOperation(null)
      setShouldResetDisplay(false)
    } else if (key === "backspace") {
      newDisplay = display.slice(0, -1)
    } else if (["+", "-", "×", "÷"].includes(key)) {
      const current = parseFloat(display || "0")
      if (lastValue !== null && operation && !shouldResetDisplay) {
        const result = calculate(parseFloat(lastValue), current, operation)
        newDisplay = result.toString()
        setLastValue(result.toString())
      } else {
        setLastValue(display || "0")
      }
      setOperation(key)
      setShouldResetDisplay(true)
    } else if (key === "=" || key === "Done") {
      const current = parseFloat(display || "0")
      if (lastValue !== null && operation) {
        const result = calculate(parseFloat(lastValue), current, operation)
        newDisplay = result.toString()
        setLastValue(null)
        setOperation(null)
        setShouldResetDisplay(true)
        if (key === "Done") {
          onConfirm(result.toString())
          return
        }
      } else if (key === "Done") {
        onConfirm(display || "0")
        return
      }
    }

    setDisplay(newDisplay)
    onValueChange?.(newDisplay || "0")
  }

  const Key = ({ 
    value, 
    label, 
    variant = "default", 
    className: keyClassName 
  }: { 
    value: string; 
    label?: React.ReactNode; 
    variant?: "default" | "operator" | "action" | "confirm";
    className?: string;
  }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => handleKeyPress(value)}
      className={cn(
        "flex h-16 items-center justify-center rounded-2xl text-xl font-medium transition-colors select-none",
        variant === "default" && "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80",
        variant === "operator" && (operation === value && !shouldResetDisplay ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"),
        variant === "action" && "bg-muted text-muted-foreground hover:bg-muted/80",
        variant === "confirm" && "bg-primary text-primary-foreground hover:bg-primary/90",
        keyClassName
      )}
    >
      {label || value}
    </motion.button>
  )

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-background rounded-t-3xl shadow-2xl border-t border-border", className)}>
      {/* Display for formula/status */}
      <div className="flex flex-col items-end justify-end px-4 h-12">
        <span className="text-sm text-muted-foreground h-5">
          {lastValue && operation ? `${lastValue} ${operation} ${!shouldResetDisplay ? display : ""}` : ""}
        </span>
        <span className="text-3xl font-bold tracking-tight text-foreground truncate w-full text-right">
          {display || "0"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Row 1 */}
        <Key value="AC" label={<RotateCcw className="size-5" />} variant="action" />
        <Key value="÷" label={<Divide className="size-5" />} variant="operator" />
        <Key value="×" label={<X className="size-5" />} variant="operator" />
        <Key value="backspace" label={<Delete className="size-5" />} variant="action" />

        {/* Row 2 */}
        <Key value="7" />
        <Key value="8" />
        <Key value="9" />
        <Key value="-" label={<Minus className="size-5" />} variant="operator" />

        {/* Row 3 */}
        <Key value="4" />
        <Key value="5" />
        <Key value="6" />
        <Key value="+" label={<Plus className="size-5" />} variant="operator" />

        {/* Row 4 */}
        <Key value="1" />
        <Key value="2" />
        <Key value="3" />
        <Key value="=" label="=" variant="operator" />

        {/* Row 5 */}
        <Key value="." />
        <Key value="0" />
        <Key value="Done" label={<Check className="size-6" />} variant="confirm" className="col-span-2" />
      </div>
    </div>
  )
}
