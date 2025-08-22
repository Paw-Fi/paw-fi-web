import { cn } from '@/lib/utils';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  className?: string;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export function ModalHeader({
  title,
  onClose,
  className = '',
  showCloseButton = true,
  children,
}: ModalHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-6 pb-4 border-b border-border',
      className
    )}>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold text-foreground leading-7">
          {title}
        </h2>
        {children && (
          <div className="mt-1 text-sm text-muted-foreground">
            {children}
          </div>
        )}
      </div>
      
      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="sr-only">Close</span>
          <FontAwesomeIcon icon={faXmark} className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
