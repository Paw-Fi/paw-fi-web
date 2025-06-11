'use client';

import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { iconMap, iconOptions } from '../profile/widgets/Widget';
import { Button } from './button';
import { Input } from './input';
import { faChartBar, faSearch } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';

interface IconSelectorProps {
  // Support both prop naming conventions for better compatibility
  value?: string;
  selectedIcon?: string;
  onValueChange?: (value: string) => void;
  onSelectIcon?: (value: string) => void;
  className?: string;
  id?: string;
}

export function IconSelector({ 
  value, 
  selectedIcon, 
  onValueChange, 
  onSelectIcon, 
  className = '',
  id
}: IconSelectorProps) {
  // Use the selectedIcon prop if provided, otherwise fall back to value
  const selectedValue = selectedIcon || value || '';
  // Use onSelectIcon if provided, otherwise fall back to onValueChange
  const handleChange = onSelectIcon || onValueChange || (() => {});
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const filteredIcons = iconOptions.filter(iconName => 
    iconName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (iconName: string) => {
    console.log('Selected icon:', iconName);
    try {
      if (typeof handleChange === 'function') {
        handleChange(iconName);
      } else {
        console.error('No change handler provided to IconSelector');
      }
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Error in handleSelect:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between px-1 py-1 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {selectedValue && iconMap[selectedValue] ? (
            <FontAwesomeIcon 
              icon={iconMap[selectedValue]||faChartBar} 
              className="h-4 w-4 text-inherit " 
            />
          ) : (
            <div className="h-4 w-4" />
          )}
          {selectedValue}
          <span className="truncate">
            {!selectedValue && "Select an icon"}
          </span>
        </div>      
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <Input
                prefix={<FontAwesomeIcon icon={faSearch} className=""/>}
                type="text"
                placeholder="Search icons..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSelect(iconName);
                  }}
                  className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                    selectedValue === iconName
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={iconName}
                >
                  <FontAwesomeIcon 
                    icon={iconMap[iconName]} 
                    className={classNames('h-4 w-4', selectedValue === iconName ? 'text-primary' : 'text-gray-700 dark:text-gray-300')}
                  />
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <div className="col-span-6 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No icons found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}