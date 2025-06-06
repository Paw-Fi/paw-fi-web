import { Link, createFileRoute } from '@tanstack/react-router';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const Route = createFileRoute('/register/')({  
  component: Register,
});

export function Register() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Moneko</h1>
        <p className="text-gray-600">Create an account to start your financial learning journey</p>
      </div>
      
      <SignUpForm />      
      
    </div>
  );
}

export default Register;
