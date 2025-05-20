import { Link, createFileRoute } from '@tanstack/react-router';
import { SignInForm } from '@/components/auth/sign-in-form';

export const Route = createFileRoute('/login/')({  
  component: Login,
});

export function Login() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Paw-Fi</h1>
        <p className="text-gray-600">Sign in to continue your financial learning journey</p>
      </div>
      
      <SignInForm />
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
