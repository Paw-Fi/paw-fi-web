import { Link } from '@tanstack/react-router';
import classnames from 'classnames';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  isLoading?: boolean;
}

interface ButtonAsButtonProps extends ButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  as?: 'button';
  to?: never;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
  as: 'link';
  to: string;
  disabled?: boolean;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  as = 'button',
  isLoading = false,
  ...props
}: ButtonProps) {
  const baseClasses = classnames(
    'font-medium rounded-lg transition-colors text-center relative',
    {
      "cursor-pointer": !props.disabled,
      // Size variants
      'py-2 px-4 text-xs': size === 'sm',
      'py-3 px-6 text-sm': size === 'md',
      'py-4 px-8 text-base': size === 'lg',
      
      // Width variants
      'w-full': fullWidth,
      
      // Color variants
      'bg-primary dark:bg-dark-primary text-white hover:bg-primary/90 dark:hover:bg-dark-primary/90 active:bg-primary/80 dark:active:bg-dark-primary/80': variant === 'primary' && !props.disabled,
      'bg-secondary dark:bg-dark-secondary text-white hover:bg-secondary/90 dark:hover:bg-dark-secondary/90 active:bg-secondary/80 dark:active:bg-dark-secondary/80': variant === 'secondary' && !props.disabled,
      'bg-transparent border border-primary dark:border-dark-primary text-primary dark:text-dark-primary hover:bg-primary dark:hover:bg-dark-primary hover:text-white': variant === 'outline' && !props.disabled,
      'bg-transparent text-primary dark:text-dark-primary hover:opacity-90 underline': variant === 'text' && !props.disabled,
      'bg-gray-900 dark:bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-gray-700 active:bg-gray-700 dark:active:bg-gray-600': variant === 'dark' && !props.disabled,
      
      // Disabled state
      'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed': props.disabled,
      'opacity-85 cursor-wait': isLoading && !props.disabled,
    },
    className
  );

  if (as === 'link' && 'to' in props) {
    return (
      <Link
        to={props.to}
        className={baseClasses}
        {...(props as any)}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        )}
        <span className={isLoading ? 'invisible' : ''}>{children}</span>
      </Link>
    );
  }

  return (
    <button
      className={baseClasses}
      disabled={isLoading || props.disabled}
      {...(props as ButtonAsButtonProps)}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
    </button>
  );
}
