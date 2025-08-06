'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from '@tanstack/react-router';

interface SignUpFormProps {
  redirectUrl?: string;
}

export function SignUpForm({ redirectUrl }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const { signUp, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const result = await signUp(email, password, { full_name: fullName }, redirectUrl);
      console.log(result);
      if (result.success) {
        // Check if email confirmation is required
        // The confirmation_sent_at property indicates an email was sent for verification
        if (result.data?.user?.confirmation_sent_at) {
          setVerificationSent(true);
        } else {
          // If no confirmation needed, navigate to redirect URL or chat
          navigate({ to: redirectUrl || '/dashboard' });
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {verificationSent ? (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to <span className="font-medium">{email}</span>. 
            Please check your inbox and click the verification link to complete your registration.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you don't see the email, please check your spam folder or
            <button 
              onClick={() => setVerificationSent(false)} 
              className="text-primary hover:underline ml-1"
            >
              try again
            </button>
          </p>        
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-6 text-center">Create Your Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full"
                placeholder="Create a password (min. 8 characters)"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        </>
      )}
     {!verificationSent && <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link to="/login" search={{ redirect: redirectUrl }} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>}
    </div>
  );
}
