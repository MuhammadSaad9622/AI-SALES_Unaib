import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>((
  {
    label,
    error,
    helperText,
    fullWidth = false,
    className = '',
    startIcon,
    endIcon,
    ...props
  },
  ref
) => {
  const baseClasses = 'block w-full px-4 py-2.5 text-gray-900 placeholder-gray-500 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200';
  
  const stateClasses = error
    ? 'border-error-500 focus:ring-error-500'
    : 'border-gray-300 focus:ring-primary-500';

  const widthClasses = fullWidth ? 'w-full' : '';

  const iconClasses = startIcon || endIcon ? 'flex items-center' : '';
  const inputWithStartIconClasses = startIcon ? 'pl-10' : '';
  const inputWithEndIconClasses = endIcon ? 'pr-10' : '';

  return (
    <div className={`${widthClasses} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className={`relative ${iconClasses}`}>
        {startIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            ${baseClasses}
            ${stateClasses}
            ${inputWithStartIconClasses}
            ${inputWithEndIconClasses}
          `}
          {...props}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
            {endIcon}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-error-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';