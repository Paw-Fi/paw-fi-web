import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    className = '',
    containerClassName = '',
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className={cn('relative', containerClassName)}>
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'block w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            className
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <FontAwesomeIcon
            icon={faChevronDown}
            className="h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
