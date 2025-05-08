import { ChangeEvent } from 'react';

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}

function NumberInput({ 
  value, 
  onChange, 
  placeholder = '0', 
  min, 
  max 
}: NumberInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = !e.target.value ? 0 : Number(e.target.value);
    
      onChange(newValue);   
  };

  return (
    <div className="w-full">
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === undefined ? '' : value}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full p-4 border border-gray-200 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
      />
    </div>
  );
}

export default NumberInput;
