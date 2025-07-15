import { Link, createFileRoute } from '@tanstack/react-router';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const Route = createFileRoute('/register/')({  
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
});

export function Register() {
  const { redirect } = Route.useSearch();
  
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Moneko</h1>
        <p className="text-gray-600">Create an account to start your financial learning journey</p>
      </div>
      
      <SignUpForm redirectUrl={redirect} />      
      
    </div>
  );
}

export default Register;
