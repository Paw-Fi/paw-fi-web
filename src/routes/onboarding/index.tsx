import React, { useEffect } from "react";
import { AIIntroComponent } from "@/components/onboarding/ai-intro-component";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/onboarding/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/onboarding");
    const title = "Start Free Financial Journey - No Login Required | Moneko";
    const description =
      "Start your personalized financial journey with Moneko instantly - no login, signup, or account required. Get immediate AI financial guidance and personalized recommendations.";
    const keywords =
      "Moneko onboarding, no login required, no signup, instant financial advice, free AI coach, financial journey, personal finance setup, financial goals, anonymous financial guidance";
    const imageUrl = "https://moneko.io/og-img.png";

    // GEO-optimized structured data for onboarding page
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${pageUrl}#webpage`,
          name: "Start Free Financial Journey - No Login Required | Moneko",
          description:
            "Start your personalized financial journey with Moneko instantly - no login, signup, or account required. Get immediate AI financial guidance and personalized recommendations.",
          url: pageUrl,
          inLanguage: "en-US",
          isPartOf: {
            "@type": "WebSite",
            "@id": "https://moneko.io#website",
          },
          about: [
            {
              "@type": "Thing",
              name: "No Login Required Financial Coaching",
              description:
                "Instant access to AI personal finance coaching without account creation, signup, or login requirements",
            },
            {
              "@type": "Thing",
              name: "Anonymous Financial Guidance",
              description:
                "Private, secure financial coaching that protects user privacy with no personal information required",
            },
          ],
          mainEntity: {
            "@type": "Service",
            name: "Instant AI Financial Coaching - No Account Required",
            description:
              "Free AI-powered financial coaching service that provides immediate personalized guidance without requiring user registration, login, or personal information sharing",
            provider: {
              "@type": "Organization",
              "@id": "https://moneko.io#organization",
            },
            serviceType: "Anonymous Financial Education",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              description:
                "Free instant access to AI financial coaching with no login, signup, or account required",
            },
            audience: {
              "@type": "Audience",
              audienceType: [
                "Privacy-Conscious Users",
                "Quick Start Seekers",
                "Anonymous Help Seekers",
              ],
            },
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Start Free Journey",
                item: pageUrl,
              },
            ],
          },
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [
              ".no-login-message",
              ".instant-access-info",
              ".privacy-assurance",
            ],
          },
        },
      ],
    };

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
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

  // Don't auto-redirect logged-in users from onboarding
  // They might have been sent here because they don't have any goals yet
  // Let them complete the onboarding flow normally
  // The dashboard will handle the reverse check (redirecting to onboarding if no goals)
  // This allows for bidirectional flow: dashboard -> onboarding (if no goals) and onboarding -> dashboard (after goal creation)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900/95 dark:to-indigo-950/30">
      {/* Background decoration - Progressive: rich on desktop, minimal on mobile */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Mobile: minimal decorations for space efficiency */}
        <div className="absolute top-4 left-4 h-32 w-32 rounded-full bg-purple-200/20 blur-2xl sm:top-10 sm:left-10 sm:h-48 sm:w-48 sm:bg-purple-200/30 sm:blur-3xl md:h-72 md:w-72 dark:bg-purple-600/10 dark:sm:bg-purple-600/15"></div>
        <div className="absolute right-4 bottom-4 h-40 w-40 rounded-full bg-indigo-200/20 blur-2xl sm:right-10 sm:bottom-10 sm:h-64 sm:w-64 sm:bg-indigo-200/30 sm:blur-3xl md:h-96 md:w-96 dark:bg-indigo-600/10 dark:sm:bg-indigo-600/15"></div>

        {/* Desktop-only center decoration */}
        <div className="absolute top-1/3 left-1/2 hidden h-56 w-56 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-pink-200/20 blur-3xl sm:block md:top-1/2 md:h-80 md:w-80 dark:bg-pink-600/10"></div>

        {/* Desktop-only additional decorations for richness */}
        <div className="absolute top-1/4 right-1/4 hidden h-48 w-48 rounded-full bg-cyan-200/15 blur-3xl lg:block dark:bg-cyan-600/8"></div>
        <div className="absolute bottom-1/3 left-1/4 hidden h-64 w-64 rounded-full bg-rose-200/15 blur-3xl xl:block dark:bg-rose-600/8"></div>
      </div>

      {/* Main chat container - Maximum height utilization */}
      <div className="relative z-10 flex h-screen flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-stretch justify-center px-0 py-0 sm:px-3 sm:py-3 lg:px-6 lg:py-4">
          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-col lg:max-w-5xl xl:max-w-6xl">
            <AIIntroComponent initialMessage={q} />
          </div>
        </div>

        {/* Footer - Mobile minimal, desktop informative */}
        <div className="flex-shrink-0 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-slate-600/70 dark:bg-slate-800/70">
          <div className="mx-auto max-w-4xl px-3 py-2 sm:px-3 sm:py-2 lg:max-w-5xl lg:px-4 xl:max-w-6xl">
            {/* Mobile: Ultra-minimal footer */}
            <div className="text-mobile-xs flex items-center justify-center gap-2.5 text-slate-500 sm:hidden dark:text-slate-400">
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-green-500"></div>
                <span>No Login</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                <span>AI Coach</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <span>Free</span>
              </div>
            </div>

            {/* Desktop: Full footer with more information */}
            <div className="hidden items-center justify-center gap-4 text-xs text-slate-600 sm:flex lg:text-sm dark:text-slate-300">
              <div className="flex items-center gap-4 lg:gap-6">
                <div className="no-login-message flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <span className="font-medium">No Login Required</span>
                </div>
                <div className="instant-access-info flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                  <span className="font-medium">Instant AI Guidance</span>
                </div>
                <div className="privacy-assurance flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                  <span className="font-medium">100% Anonymous</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                  <span className="font-medium">Always Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
