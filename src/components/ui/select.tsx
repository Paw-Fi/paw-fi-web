"use client";

import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faCheck } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

// Define common types for Select component
interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string | undefined;
  selectValueAction: (value: string | undefined) => void; // Changed from setSelectedValue
  options: SelectOption[];
  placeholder?: string;
  // onValueChange is handled by SelectRoot via selectValueAction
}

const SelectContext = React.createContext<SelectContextType | undefined>(
  undefined
);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext must be used within a SelectProvider");
  }
  return context;
};

// --- Select Root Component (Provider) ---
interface SelectProps {
  children: React.ReactNode;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SelectRoot = ({ 
  children,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className
}: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  // Renamed state variable for clarity
  const [internalSelectedValue, setInternalSelectedValue] = React.useState<string | undefined>(
    value !== undefined ? value : defaultValue
  );
  const selectRef = React.useRef<HTMLDivElement>(null);

  // Controlled component: Update internal state if 'value' prop changes
  React.useEffect(() => {
    if (value !== undefined) {
      setInternalSelectedValue(value);
    }
  }, [value]);

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Action to be called by SelectItem
  const selectValueAction = (newValue: string | undefined) => {
    setInternalSelectedValue(newValue); // Update internal state
    if (onValueChange) {
      onValueChange(newValue); // Call prop handler if provided
    }
    setIsOpen(false); // Close dropdown on selection
  };

  return (
    <SelectContext.Provider 
      value={{
        isOpen,
        setIsOpen,
        selectedValue: internalSelectedValue, // Provide internal state value
        selectValueAction, // Provide the action method
        options,
        placeholder
      }}
    >
      <div ref={selectRef} className={cn("relative", className, { 'opacity-50 cursor-not-allowed': disabled })}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};
SelectRoot.displayName = "Select";

// --- SelectTrigger Component ---
interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  SelectTriggerProps
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen, selectedValue, options, placeholder } = useSelectContext();
  const selectedOption = React.useMemo(() => {
    if (Array.isArray(options) && selectedValue !== undefined) { // Ensure options is an array
      return options.find(opt => opt.value === selectedValue);
    }
    return undefined;
  }, [options, selectedValue]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      {...props}
    >
      {children ? children : (selectedOption ? selectedOption.label : placeholder || "Select...")}
      <FontAwesomeIcon 
        icon={faChevronDown} 
        className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} 
      />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

// --- SelectContent Component ---
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'popper' | 'item-aligned'; // Simplified positioning
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectContentProps
>(({ className, children, position = 'popper', ...props }, ref) => {
  const { isOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        "absolute z-50 mt-1 min-w-[var(--radix-select-trigger-width)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
        // Basic positioning, can be enhanced
        position === 'popper' ? "top-full" : "", 
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
    </div>
  );
});
SelectContent.displayName = "SelectContent";

// --- SelectItem Component ---
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  SelectItemProps
>(({ className, children, value, disabled, ...props }, ref) => {
  // Use selectValueAction from context
  const { selectedValue, selectValueAction } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      data-disabled={disabled ? "" : undefined}
      // Call selectValueAction on click
      onClick={() => !disabled && selectValueAction(value)}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        disabled && "text-muted-foreground",
        !disabled && "hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

// --- SelectLabel (Optional, for grouping) ---
const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

// --- SelectSeparator (Optional) ---
const SelectSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

// --- SelectValue (Placeholder for potential direct value display if needed, or for trigger content) ---
// This component might be re-thought. The trigger itself displays the value.
// For now, it can be a simple way to pass children to the trigger if custom rendering is needed.
const SelectValue = ({ children }: { children?: React.ReactNode }) => {
  // This component doesn't render anything itself if used directly.
  // Its children are typically handled by SelectTrigger.
  // If no children, trigger shows selected value or placeholder.
  return <>{children}</>; 
};
SelectValue.displayName = "SelectValue";

// --- SelectGroup (Optional, for grouping items with a label) ---
const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("py-1", className)} {...props} />
));
SelectGroup.displayName = "SelectGroup";

// Export the components
export {
  SelectRoot as Select, // Renaming SelectRoot to Select for conventional usage
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectGroup,
};

export type { SelectOption };

