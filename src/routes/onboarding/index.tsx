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

  // useEffect(() => {
  //   if (user&&profile) {
  //     navigate({ to: '/dashboard' });
  //   }
  // }, [user, navigate,profile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/20 dark:bg-purple-700/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-700/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200/10 dark:bg-pink-700/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Main chat container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-5xl mx-auto">
            <AIIntroComponent initialMessage={q} />
          </div>
        </div>
        
        {/* Informative footer */}
        <div className="flex-shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AI-Powered Guidance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Personalized Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span>Expert-Backed Advice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
