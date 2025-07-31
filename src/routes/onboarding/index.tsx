import { AIIntroComponent } from '@/components/onboarding/ai-intro-component';
import { useAuth } from '@/contexts/auth-context';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react';

export const Route = createFileRoute('/onboarding/')({
  component: RouteComponent,
})

function RouteComponent() {
  const {user} = useAuth();
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (user) {
  //     navigate({ to: '/dashboard' });
  //   }
  // }, [user, navigate]);

  return <AIIntroComponent/>
}
