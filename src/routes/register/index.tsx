import { Link, createFileRoute } from '@tanstack/react-router';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/register/')({  
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl('/register');
    const meta = seo({
      title: 'Sign Up | Moneko',
      description: 'Create a free Moneko account to access personalized financial education, calculators, and AI chat.',
      keywords: 'sign up, register, create account, Moneko, financial education, free account',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
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
