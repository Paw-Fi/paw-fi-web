import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  onChange,
  options,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-lg font-medium">{label}</h3>
      <div className="flex items-center space-x-4">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SelectInput;
