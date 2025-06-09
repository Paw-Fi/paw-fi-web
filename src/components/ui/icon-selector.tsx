'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { iconMap, iconOptions } from '../profile/widgets/Widget';

interface IconSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function IconSelector({ value, onValueChange, className = '' }: IconSelectorProps) {
  return (
    <div className={className}>
      <Label htmlFor="icon-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Icon
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="icon-selector" className="w-full">
          <div className="flex items-center">
            {value && iconMap[value] && (
              <FontAwesomeIcon icon={iconMap[value]} className="mr-2 h-4 w-4" />
            )}
            <SelectValue placeholder="Select an icon" />
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {iconOptions.map((iconName) => (
            <SelectItem key={iconName} value={iconName}>
              <div className="flex items-center">
                <FontAwesomeIcon icon={iconMap[iconName]} className="mr-2 h-4 w-4" />       
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
