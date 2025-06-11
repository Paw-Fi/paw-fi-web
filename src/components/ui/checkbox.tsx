import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

// Extend HTMLInputElement props but override some to be more specific
type CheckboxProps = {
  label?: string;
  containerClassName?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  value?: string | number | readonly string[] | undefined;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked' | 'value'>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    containerClassName, 
    label, 
    checked, 
    onCheckedChange, 
    onChange, 
    ...props 
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <label className={cn('inline-flex items-center space-x-2 cursor-pointer', containerClassName)}>
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            className={cn(
              'peer h-4 w-4 appearance-none rounded border border-gray-300',
              'focus:ring-2 focus:ring-offset-2 focus:ring-primary/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'checked:bg-primary checked:border-primary',
              'transition-colors duration-200',
              className
            )}
            {...props}
          />
          <FontAwesomeIcon
            icon={faCheck}
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'h-3 w-3 text-white pointer-events-none',
              'opacity-0 peer-checked:opacity-100 transition-opacity duration-200'
            )}
          />
        </div>
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
