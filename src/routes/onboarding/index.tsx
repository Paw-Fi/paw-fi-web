import { useState } from 'react';
import { useNavigate, createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

export const Route = createFileRoute('/onboarding/')({  
  component: Onboarding,
});

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Redirect to login if not authenticated
  if (!user) {
    navigate({ to: '/login' });
    return null;
  }
  
  const handleComplete = () => {
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Welcome to Moneko!</h1>
        
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Let's get to know you better</h2>
            <p className="text-gray-600">
              Moneko is your personal finance learning companion. We'll help you understand financial concepts
              through interactive lessons tailored to your interests and goals.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What are your financial goals?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Save for the future', 'Learn about investing', 'Manage debt', 'Build credit'].map((goal) => (
                <div 
                  key={goal}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => {}}
                >
                  {goal}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">You're all set!</h2>
            <p className="text-gray-600">
              We've prepared some starter lessons for you. You can always explore more topics
              in our learning library.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleComplete}>Start Learning</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;
