import { Link, createFileRoute } from '@tanstack/react-router';
import { SignInForm } from '@/components/auth/sign-in-form';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/login/')({  
  component: Login,
  head: () => {
    const pageUrl = getCanonicalUrl('/login');
    const meta = seo({
      title: 'Sign In | Moneko',
      description: 'Sign in to your Moneko account to access personalized financial education, calculators, and AI chat.',
      keywords: 'sign in, login, Moneko, financial education, user account',
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

export function Login() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Moneko</h1>
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
