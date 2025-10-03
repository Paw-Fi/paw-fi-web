import React from 'react';
import { Slider } from './slider';
import { Input } from './input';
import { Label } from './label';

interface RangeSliderProps {
  label: string;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
  min: number | string | undefined;
  max: number | string | undefined;
  step: number | string | undefined;
  formatValue?: (value: number | string) => string;
  unit?: string;
  className?: string;
  showValue?: boolean;
  isValueEditable?: boolean;
  type?: 'number' | 'date';
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  unit = '',
  className = '',
  showValue = true,
  isValueEditable = false,
  type = 'number',
}) => {
  // Constants
  const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
  
  // Handle date type differently
  if (type === 'date') {
    // For date type, value should be a date string, min/max should be date strings
    const dateValue = typeof value === 'string' ? value : new Date().toISOString().split('T')[0];
    const minDate = typeof min === 'string' ? min : new Date().toISOString().split('T')[0];
    const maxDate = typeof max === 'string' ? max : new Date(Date.now() + 365 * MILLISECONDS_IN_A_DAY).toISOString().split('T')[0];
    
    // Convert dates to numbers for slider calculation
    const dateToNumber = (dateStr: string) => new Date(dateStr).getTime();
    const numberToDate = (num: number) => new Date(num).toISOString().split('T')[0];
    
    const numericValue = dateToNumber(dateValue);
    const numericMin = dateToNumber(minDate);
    const numericMax = dateToNumber(maxDate);
    const numericStep = typeof step === 'string' ? parseFloat(step) : (step ?? 1);
    
    // Format display value for dates
    const displayValue = formatValue 
      ? formatValue(dateValue)
      : new Date(dateValue).toLocaleDateString();

    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-lg font-medium">{label}</Label>
        <div className="flex items-center space-x-4">
          <Slider
            value={[numericValue]}
            onValueChange={(values) => {
              const newDateValue = numberToDate(values[0]);
              onChange(newDateValue);
            }}
            min={numericMin}
            max={numericMax}
            step={numericStep * MILLISECONDS_IN_A_DAY} // Convert days to milliseconds
            className="flex-grow"
          />
          {showValue && isValueEditable ? (
            <Input 
              type="date" 
              value={dateValue} 
              min={minDate}
              max={maxDate}
              onChange={(e) => onChange(e.target.value)} 
              className="w-32"
            />
          ) : (
            <span className="w-32 font-medium text-moneko-foreground">{displayValue}</span>
          )}
        </div>
      </div>
    );
  }

  // Original number handling
  // Convert to numbers with safe defaults
  const numericValue = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const numericMin = typeof min === 'string' ? parseFloat(min) : (min ?? 0);
  const numericMax = typeof max === 'string' ? parseFloat(max) : (max ?? 100);
  const numericStep = typeof step === 'string' ? parseFloat(step) : (step ?? 1);
  
  // Format display value safely
  const safeValue = value ?? 0;
  const displayValue = formatValue 
    ? formatValue(safeValue)
    : unit 
      ? `${safeValue}${unit}` 
      : `${safeValue}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-lg font-medium">{label}</Label>
      <div className="flex items-center space-x-4">
        <Slider
          value={[numericValue]}
          onValueChange={(values) => {
            const newValue = step.toString().includes('.') 
              ? parseFloat(values[0].toString())
              : parseInt(values[0].toString(), 10);
            onChange(newValue);
          }}
          min={numericMin}
          max={numericMax}
          step={numericStep}
          className="flex-grow"
        />
        {showValue && isValueEditable ? (
          <Input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-24"
          />
        ) : (
          <span className="w-24 font-medium text-foreground">{displayValue}</span>
        )}
      </div>
    </div>
  );
};

export default RangeSlider;
