import { AIIntroComponent } from '@/components/onboarding/ai-intro-component';
import { useAuth } from '@/contexts/auth-context';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react';

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';

export const Route = createFileRoute('/onboarding/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/onboarding");
    const title = "Moneko Onboarding: Start Your Financial Journey";
    const description = "Begin your personalized financial journey with Moneko. Our onboarding process helps you set up your profile and goals for a tailored experience.";
    const keywords = "Moneko onboarding, financial journey, personal finance setup, financial goals, new user guide";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function RouteComponent() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const {profile}=useFinancialHealthProfile(user?.id)

  useEffect(() => {
    if (user&&profile) {
      navigate({ to: '/dashboard' });
    }
  }, [user, navigate,profile]);

  return <AIIntroComponent initialMessage={q} />
}
