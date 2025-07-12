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
}) => {
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
        {showValue && <span className="w-24 font-medium">{displayValue}</span>}
      </div>
    </div>
  );
};

export default RangeSlider;
