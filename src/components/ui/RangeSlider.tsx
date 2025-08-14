import React from 'react';

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
  // Handle date type differently
  if (type === 'date') {
    // For date type, value should be a date string, min/max should be date strings
    const dateValue = typeof value === 'string' ? value : new Date().toISOString().split('T')[0];
    const minDate = typeof min === 'string' ? min : new Date().toISOString().split('T')[0];
    const maxDate = typeof max === 'string' ? max : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Convert dates to numbers for slider calculation
    const dateToNumber = (dateStr: string) => new Date(dateStr).getTime();
    const numberToDate = (num: number) => new Date(num).toISOString().split('T')[0];
    
    const numericValue = dateToNumber(dateValue);
    const numericMin = dateToNumber(minDate);
    const numericMax = dateToNumber(maxDate);
    const numericStep = typeof step === 'string' ? parseFloat(step) : (step ?? 1);
    
    // Calculate progress for date slider
    const progress = numericMax > numericMin 
      ? ((numericValue - numericMin) / (numericMax - numericMin)) * 100
      : 0;
    
    // Format display value for dates
    const displayValue = formatValue 
      ? formatValue(dateValue)
      : new Date(dateValue).toLocaleDateString();

    return (
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-lg font-medium">{label}</h3>
        <div className="flex items-center space-x-4">
          <input 
            type="range" 
            min={numericMin} 
            max={numericMax} 
            step={numericStep * 24 * 60 * 60 * 1000} // Convert days to milliseconds
            value={numericValue} 
            onChange={(e) => {
              const newDateValue = numberToDate(parseInt(e.target.value, 10));
              onChange(newDateValue);
            }} 
            className="flex-grow custom-slider"
            style={{ '--slider-progress': `${progress}%` } as React.CSSProperties}
          />
          {showValue && isValueEditable ? (
            <input 
              type="date" 
              value={dateValue} 
              min={minDate}
              max={maxDate}
              onChange={(e) => onChange(e.target.value)} 
              className="w-32 font-medium px-2 py-1 border rounded"
            />
          ) : (
            <span className="w-32 font-medium">{displayValue}</span>
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
  
  // Calculate progress safely
  const progress = numericMax > numericMin 
    ? ((numericValue - numericMin) / (numericMax - numericMin)) * 100
    : 0;
  
  // Format display value safely
  const safeValue = value ?? 0;
  const displayValue = formatValue 
    ? formatValue(safeValue)
    : unit 
      ? `${safeValue}${unit}` 
      : `${safeValue}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-lg font-medium">{label}</h3>
      <div className="flex items-center space-x-4">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={(e) => {
            const newValue = e.target.type === 'range' 
              ? (step.toString().includes('.') 
                ? parseFloat(e.target.value) 
                : parseInt(e.target.value, 10))
              : e.target.value;
            onChange(newValue);
          }} 
          className="flex-grow custom-slider"
          style={{ '--slider-progress': `${progress}%` } as React.CSSProperties}
        />
        {showValue && isValueEditable ? (
          <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-24 font-medium px-2 py-1 border rounded" 
          />
        ) : (
          <span className="w-24 font-medium">{displayValue}</span>
        )}
      </div>
    </div>
  );
};

export default RangeSlider;
