import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | undefined>(
    value ? options.find(option => option.value === value) : undefined
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (value) {
      setSelectedOption(options.find(option => option.value === value));
    }
  }, [value, options]);

  const handleSelect = (option: DropdownOption) => {
    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`inline-flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200 ${buttonClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          {selectedOption?.icon && <span className="mr-2">{selectedOption.icon}</span>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-100 focus:outline-none transform transition-all duration-200 origin-top-right ${menuClassName}`}
        >
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                className={`${selectedOption?.value === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'} flex items-center justify-start w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150`}
                onClick={() => handleSelect(option)}
              >
                {option.icon && <span className="mr-3 flex items-center justify-center w-6">{option.icon}</span>}
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};