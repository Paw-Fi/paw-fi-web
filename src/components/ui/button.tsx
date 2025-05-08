import { Link } from '@tanstack/react-router';
import classnames from 'classnames';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
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
  ...props
}: ButtonProps) {
  const baseClasses = classnames(
    'font-medium rounded-lg transition-colors text-center',
    {
      "cursor-pointer": !props.disabled,
      // Size variants
      'py-2 px-4 text-xs': size === 'sm',
      'py-3 px-6 text-sm': size === 'md',
      'py-4 px-8 text-base': size === 'lg',
      
      // Width variants
      'w-full': fullWidth,
      
      // Color variants
      'bg-primary text-white hover:opacity-90 active:opacity-80': variant === 'primary' && !props.disabled,
      'bg-secondary text-gray-800 hover:opacity-90 active:opacity-80': variant === 'secondary' && !props.disabled,
      'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white': variant === 'outline' && !props.disabled,
      'bg-transparent text-primary hover:opacity-90 underline': variant === 'text' && !props.disabled,
      'bg-[#1b1b1b] text-white hover:opacity-90 active:opacity-80': variant === 'dark' && !props.disabled,
      
      // Disabled state
      'bg-gray-200 text-gray-400 cursor-not-allowed': props.disabled,
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
        {children}
      </Link>
    );
  }

  return (
    <button
      className={baseClasses}
      {...(props as ButtonAsButtonProps)}
    >
      {children}
    </button>
  );
}
