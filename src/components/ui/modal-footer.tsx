import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModalFooterProps {
  className?: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between' | 'around' | 'evenly';
}

export function ModalFooter({
  className = '',
  children,
  align = 'right',
  ...props
}: ModalFooterProps) {
  const alignment = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }[align];

  return (
    <div
      className={cn(
        'flex flex-shrink-0 px-6 py-4 border-t border-border',
        alignment,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ModalActionButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'link';
  isLoading?: boolean;
}

ModalFooter.Action = function ModalActionButton({
  variant = 'primary',
  isLoading = false,
  className = '',
  children,
  ...props
}: ModalActionButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn(
        'transition-colors',
        variant === 'primary' && 'bg-primary hover:bg-primary/90',
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
};
