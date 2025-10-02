import React, { useEffect } from 'react';
import { AIIntroComponent } from '@/components/onboarding/ai-intro-component';
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { profile } from 'console';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { useAuth } from '@/contexts/auth-context';

export const Route = createFileRoute('/onboarding/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/onboarding");
    const title = "Start Free Financial Journey - No Login Required | Moneko";
    const description = "Start your personalized financial journey with Moneko instantly - no login, signup, or account required. Get immediate AI financial guidance and personalized recommendations.";
    const keywords = "Moneko onboarding, no login required, no signup, instant financial advice, free AI coach, financial journey, personal finance setup, financial goals, anonymous financial guidance";
    const imageUrl = "https://moneko.io/og-img.png";

    // GEO-optimized structured data for onboarding page
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${pageUrl}#webpage`,
          "name": "Start Free Financial Journey - No Login Required | Moneko",
          "description": "Start your personalized financial journey with Moneko instantly - no login, signup, or account required. Get immediate AI financial guidance and personalized recommendations.",
          "url": pageUrl,
          "inLanguage": "en-US",
          "isPartOf": {
            "@type": "WebSite",
            "@id": "https://moneko.io#website"
          },
          "about": [
            {
              "@type": "Thing",
              "name": "No Login Required Financial Coaching",
              "description": "Instant access to AI personal finance coaching without account creation, signup, or login requirements"
            },
            {
              "@type": "Thing",
              "name": "Anonymous Financial Guidance",
              "description": "Private, secure financial coaching that protects user privacy with no personal information required"
            }
          ],
          "mainEntity": {
            "@type": "Service",
            "name": "Instant AI Financial Coaching - No Account Required",
            "description": "Free AI-powered financial coaching service that provides immediate personalized guidance without requiring user registration, login, or personal information sharing",
            "provider": {
              "@type": "Organization",
              "@id": "https://moneko.io#organization"
            },
            "serviceType": "Anonymous Financial Education",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
              "description": "Free instant access to AI financial coaching with no login, signup, or account required"
            },
            "audience": {
              "@type": "Audience",
              "audienceType": ["Privacy-Conscious Users", "Quick Start Seekers", "Anonymous Help Seekers"]
            }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://moneko.io"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Start Free Journey",
                "item": pageUrl
              }
            ]
          },
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".no-login-message", ".instant-access-info", ".privacy-assurance"]
          }
        }
      ]
    };

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
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function RouteComponent() {
  const { q } = Route.useSearch();
  const { user } = useAuth();
  const { profile } = useFinancialHealthProfile(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (user&&profile) {
      navigate({ to: '/dashboard' });
    }
  }, [user, navigate,profile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900/95 dark:to-indigo-950/30">
      {/* Background decoration - Progressive: rich on desktop, minimal on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Mobile: minimal decorations for space efficiency */}
        <div className="absolute top-4 left-4 w-32 h-32 sm:top-10 sm:left-10 sm:w-48 md:w-72 sm:h-48 md:h-72 bg-purple-200/20 sm:bg-purple-200/30 dark:bg-purple-600/10 dark:sm:bg-purple-600/15 rounded-full blur-2xl sm:blur-3xl"></div>
        <div className="absolute bottom-4 right-4 w-40 h-40 sm:bottom-10 sm:right-10 sm:w-64 md:w-96 sm:h-64 md:h-96 bg-indigo-200/20 sm:bg-indigo-200/30 dark:bg-indigo-600/10 dark:sm:bg-indigo-600/15 rounded-full blur-2xl sm:blur-3xl"></div>
        
        {/* Desktop-only center decoration */}
        <div className="hidden sm:block absolute top-1/3 md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 md:w-80 h-56 md:h-80 bg-pink-200/20 dark:bg-pink-600/10 rounded-full blur-3xl"></div>
        
        {/* Desktop-only additional decorations for richness */}
        <div className="hidden lg:block absolute top-1/4 right-1/4 w-48 h-48 bg-cyan-200/15 dark:bg-cyan-600/8 rounded-full blur-3xl"></div>
        <div className="hidden xl:block absolute bottom-1/3 left-1/4 w-64 h-64 bg-rose-200/15 dark:bg-rose-600/8 rounded-full blur-3xl"></div>
      </div>
      
      {/* Main chat container - Maximum height utilization */}
      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-stretch justify-center px-0 sm:px-3 lg:px-6 py-0 sm:py-3 lg:py-4 min-h-0">
          <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex flex-col min-h-0">
            <AIIntroComponent initialMessage={q} />
          </div>
        </div>

        {/* Footer - Mobile minimal, desktop informative */}
        <div className="flex-shrink-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-t border-slate-200/70 dark:border-slate-600/70">
          <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-3 lg:px-4 py-2 sm:py-2">
            {/* Mobile: Ultra-minimal footer */}
            <div className="flex sm:hidden items-center justify-center gap-2.5 text-mobile-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <span>No Login</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <span>AI Coach</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Free</span>
              </div>
            </div>
            
            {/* Desktop: Full footer with more information */}
            <div className="hidden sm:flex items-center justify-center gap-4 text-xs lg:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-4 lg:gap-6">
                <div className="flex items-center gap-1.5 no-login-message">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="font-medium">No Login Required</span>
                </div>
                <div className="flex items-center gap-1.5 instant-access-info">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Instant AI Guidance</span>
                </div>
                <div className="flex items-center gap-1.5 privacy-assurance">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">100% Anonymous</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span className="font-medium">Always Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
