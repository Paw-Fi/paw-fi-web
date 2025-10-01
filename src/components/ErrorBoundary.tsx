import React from 'react';
import { performanceMonitor } from '@/utils/performance-monitor';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for performance monitoring
    console.error('React Error Boundary caught error:', error, errorInfo);
    
    // Send to performance monitoring
    if (performanceMonitor) {
      // Log as a performance issue
      console.warn('🚨 React Error Boundary: Application error detected', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallback: Fallback } = this.props;

      const retry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      };

      if (Fallback && error) {
        return <Fallback error={error} retry={retry} />;
      }

      return (
        <div className="min-h-screen bg-moneko-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card rounded-3xl p-8 text-center border border-border/50">
            <div className="w-16 h-16 mx-auto mb-6 bg-destructive/10 rounded-3xl flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-destructive" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-semibold text-foreground mb-4">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            <div className="flex gap-3">
              <button
                onClick={retry}
                className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-2xl font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-muted text-muted-foreground py-3 px-4 rounded-2xl font-medium hover:bg-muted/80 transition-colors"
              >
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Developer Details
                </summary>
                <pre className="mt-2 text-xs text-destructive bg-destructive/5 p-3 rounded-xl overflow-auto max-h-48">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error fallback component
export function ErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void 
}) {
  return (
    <div className="min-h-screen bg-moneko-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-3xl p-8 text-center border border-border/50">
        <div className="w-16 h-16 mx-auto mb-6 bg-destructive/10 rounded-3xl flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-destructive" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Application Error
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>

        <button
          onClick={retry}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-2xl font-medium hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}