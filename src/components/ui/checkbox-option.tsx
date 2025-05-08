import classnames from 'classnames';
import type { Option } from '@/types/questions';

interface CheckboxOptionProps {
  option: Option;
  isSelected: boolean;
  onChange: (id: string) => void;
}

function CheckboxOption({ option, isSelected, onChange }: CheckboxOptionProps) {
  return (
    <div 
      className={classnames(
        'p-4 rounded-lg border cursor-pointer mb-3 transition-all',
        {
          'border-purple-300 bg-purple-50': isSelected,
          'border-gray-200 hover:border-gray-300': !isSelected
        }
      )}
      onClick={() => onChange(option.id)}
    >
      <div className="flex items-center">
        <div className={classnames(
          'w-6 h-6 rounded-md mr-3',
          {
            'bg-purple-primary flex items-center justify-center': isSelected,
            'border border-gray-300': !isSelected
          }
        )}>
          {isSelected && (
            <svg 
              width="14" 
              height="10" 
              viewBox="0 0 14 10" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M1 5L5 9L13 1" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">{option.label}</span>
          {option.description && (
            <span className="text-sm text-gray-600">{option.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CheckboxOption;
