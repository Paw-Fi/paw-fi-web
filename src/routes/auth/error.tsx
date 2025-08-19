import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/auth/error')({
  component: AuthError,
});

function AuthError() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg 
            className="mx-auto h-16 w-16 text-red-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Email Verification Failed
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We couldn't verify your email address. This could happen if:
        </p>
        
        <ul className="text-left text-sm text-gray-600 dark:text-gray-300 mb-8 space-y-2">
          <li>• The verification link has expired</li>
          <li>• The link has already been used</li>
          <li>• The link is invalid or corrupted</li>
        </ul>
        
        <div className="space-y-4">
          <Link to="/register" search={{ redirect: undefined }}>
            <Button className="w-full bg-primary hover:bg-primary/90">
              Try Signing Up Again
            </Button>
          </Link>
          
          <Link to="/login" search={{ redirect: undefined }}>
            <Button variant="outline" className="w-full">
              Already have an account? Sign In
            </Button>
          </Link>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Need help? Contact our support team for assistance.
        </p>
      </div>
    </div>
  );
}
