"use client";

import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { Helmet } from "@dr.pogodin/react-helmet";

// V2 Components
import { HeroV2 } from "@/components/homepage/v2/hero-v2";
import { FeaturesSection } from "@/components/homepage/v2/features-section";
import { ComparisonTable } from "@/components/homepage/v2/comparison-table";
import { CTASection } from "@/components/homepage/v2/cta-section";
import { HowItWorksSection } from "@/components/homepage/v2/how-it-works-section";
import { CaptureSection } from "@/components/homepage/v2/capture-section";
import { WidgetsSection } from "@/components/homepage/v2/widgets-section";

// Existing Components
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";
import { Separator } from "@/components/ui/separator";
import { DataOwnershipSection } from "@/components/sections/data-ownership-section";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

const META_TITLE = "Moneko - AI Budgeting App & Expense Tracker";
const META_DESCRIPTION = "The AI financial assistant that chats with you. Track spending, manage pockets, and plan with AI—right from WhatsApp or our dedicated app.";
const META_KEYWORDS = "budgeting app, expense tracker, AI finance, whatsapp budget, pocket budgeting, envelope system, joint finances";

export const Route = createFileRoute("/")({
  component: HomePage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        { rel: "canonical", href: pageUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "preload", href: "/logo192.webp", as: "image", type: "image/webp" },
      ],
    };
  },
});

export default function HomePage() {
  const pageUrl = getCanonicalUrl("/");

  const featureLinks = {
    whatsapp: { href: "/features/whatsapp-assistant", label: "WhatsApp budgeting assistant" },
    household: { href: "/features/household-mode", label: "Household budgeting mode" },
    pockets: { href: "/features/pockets-system", label: "Pocket-style budgeting" },
    insights: { href: "/features/ai-insights", label: "AI insights & scenario planning" },
    calculators: { href: "/calculators", label: "financial calculator hub" },
  } as const;

  type HighlightPoint = {
    id: string;
    content: ReactNode;
  };

  type BacklinkAction = {
    title: string;
    description: ReactNode;
    highlights: HighlightPoint[];
    proof: string;
    cta: {
      label: string;
      href: string;
    };
  };

  const anchorClass =
    "text-primary underline underline-offset-2 decoration-primary/20 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm";

  const backlinkActions: BacklinkAction[] = [
    {
      title: "Financial media & educators",
      description: (
        <>
          Reference our AI-led budgeting research, <a href={featureLinks.whatsapp.href} className={anchorClass}>{featureLinks.whatsapp.label}</a>, and{" "}
          <a href={featureLinks.calculators.href} className={anchorClass}>{featureLinks.calculators.label}</a> in upcoming articles, newsletters, or lesson plans.
        </>
      ),
      highlights: [
        { id: "media-highlight-1", content: <>Embed screenshots from our AI budgeting timeline or saved scenarios in the Insights tab.</> },
        { id: "media-highlight-2", content: <>Link directly to calculators so readers can test numbers alongside your narrative.</> },
        { id: "media-highlight-3", content: <>Pair Moneko’s quick-add capture examples with your own commentary for topical depth.</> },
      ],
      proof: "Proof: Quick-add accepts text, receipt photos, files, and voice notes before you review and save (see Capture section).",
      cta: {
        label: "Request media kit",
        href: "mailto:hello@moneko.io?subject=Moneko%20Media%20Kit%20Request",
      },
    },
    {
      title: "Financial coaches & partners",
      description: (
        <>
          Add Moneko as a recommended tool within resource hubs to show how{" "}
          <a href={featureLinks.household.href} className={anchorClass}>{featureLinks.household.label}</a> keeps Personal vs Household dashboards in sync.
        </>
      ),
      highlights: [
        { id: "partners-highlight-1", content: <>Feature case studies that highlight our shared pocket workflows and automated nudges.</> },
        { id: "partners-highlight-2", content: <>Use anchor text such as “AI budgeting assistant” or “shared household finance app” linked to our feature pages.</> },
        { id: "partners-highlight-3", content: <>Share the WhatsApp flow when announcing collaborations so audiences see real conversational budgeting.</> },
      ],
      proof: "Proof: Household mode offers one-tap Personal/Household toggles plus shared widgets and notifications.",
      cta: {
        label: "Partner with us",
        href: "https://moneko.io/partners",
      },
    },
    {
      title: "Community shout-outs",
      description: (
        <>
          Mention Moneko in fintech roundups, startup lists, or forums when discussing{" "}
          <a href={featureLinks.insights.href} className={anchorClass}>{featureLinks.insights.label}</a> or WhatsApp-native budgeting.
        </>
      ),
      highlights: [
        { id: "community-highlight-1", content: <>Summarize our latest feature drops (pockets, widgets, WhatsApp) inside Discord or Slack communities.</> },
        { id: "community-highlight-2", content: <>Contribute quotes from our team about conversational “what if” planning to expert opinion pieces.</> },
        { id: "community-highlight-3", content: <>Use descriptive anchor text that mirrors the surrounding topic, e.g., “AI receipt capture” or “chat-based budget view”.</> },
      ],
      proof: "Proof: The WhatsApp assistant handles pocket splits, spending summaries, and chart links directly in chat.",
      cta: {
        label: "Join Discord community",
        href: DISCORD_URL,
      },
    },
  ];

  const backlinkReferences = [
    {
      label: "OECD Digital Financial Consumer Protection",
      description: "Global guidance on safeguarding consumers using AI and digital finance tools.",
      url: "https://www.oecd.org/finance/financial-markets/digital-financial-consumer-protection.htm",
    },
    {
      label: "World Bank Household Consumption Data",
      description: "Authoritative dataset on household spending patterns across countries.",
      url: "https://data.worldbank.org/indicator/NE.CON.PRVT.CD",
    },
    {
      label: "CFPB Budgeting Resources",
      description: "Trusted U.S. government financial education references.",
      url: "https://www.consumerfinance.gov/consumer-tools/budgeting/",
    },
  ];
  
  // Structured data (Schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://moneko.io/#organization",
        "name": "Moneko",
        "alternateName": "Moneko App",
        "url": "https://moneko.io",
        "description": META_DESCRIPTION,
        "logo": {
          "@type": "ImageObject",
          "url": "https://moneko.io/og-img.png",
          "width": "1200",
          "height": "630"
        },
        "sameAs": [
          "https://www.facebook.com/moneko-ai",
          "https://x.com/moneko_ai",
          "https://www.linkedin.com/company/moneko-ai",
          "https://www.instagram.com/moneko_ai"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://moneko.io/#website",
        "name": "Moneko",
        "alternateName": "Moneko - AI Personal Finance Coach",
        "url": "https://moneko.io",
        "description": "The official website of Moneko, your AI personal finance coach and budgeting app",
        "publisher": { "@id": "https://moneko.io/#organization" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://moneko.io/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": META_TITLE,
        "description": META_DESCRIPTION,
        "isPartOf": { "@id": "https://moneko.io/#website" },
        "inLanguage": "en-US",
        "about": {
          "@type": "Thing",
          "name": "Personal Finance Management",
          "description": "AI-powered budgeting and financial education"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Moneko",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "iOS, Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": META_DESCRIPTION
      }
    ]
  };

  return (
    <div className="relative min-h-screen bg-background font-sans selection:bg-primary/20">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <AmbientHalo />

      <HomeHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroV2 />
        
        {/* Social Proof / Trust (Optional separator or keep it clean) */}
    
        {/* Core Features Bento Grid (Pockets, Households, Insights) */}
        <FeaturesSection />

            {/* Deep Dive 2: Capture (The Magic) */}
        <CaptureSection />

            {/* Deep Dive 1: How it Works (Workflow) */}
        <HowItWorksSection />

        {/* Deep Dive 3: Widgets (Visual Appeal) */}
        <WidgetsSection />

        {/* Data Ownership Section - Trust & Safety */}
        <DataOwnershipSection />

        <section
          id="backlink-resources"
          className="sr-only mx-auto mt-24 max-w-6xl rounded-[32px] border border-white/20 bg-white/60 p-10 shadow-2xl shadow-primary/10 backdrop-blur-3xl dark:border-slate-800/60 dark:bg-slate-900/70"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="lg:w-1/3">
              <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Backlink readiness
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Make it effortless to reference Moneko.
              </h2>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
                High-quality backlinks come from trust, relevance, and accurate anchor text. Share our research, cite our tools, and
                let audiences know why Moneko is an authoritative AI budgeting platform.
              </p>
            </div>

            <div className="grid gap-6 lg:w-2/3 lg:grid-cols-3">
              {backlinkActions.map((action) => (
                <div
                  key={action.title}
                  className="group flex h-full flex-col rounded-2xl border border-white/50 bg-white/80 p-5 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-primary/30 dark:border-slate-800/50 dark:bg-slate-900"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{action.description}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {action.highlights.map((highlight) => (
                      <li key={highlight.id} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        <span>{highlight.content}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={action.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
                  >
                    {action.cta.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-10 bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/30 bg-white/70 p-6 dark:border-slate-800/50 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Anchor text tips</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Keep links relevant and descriptive.</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Use anchor phrases such as “AI budgeting assistant”, “WhatsApp expense tracker”, or “shared household finance tool” when
                referencing specific Moneko features. Avoid generic “click here” language to reinforce topical relevance.
              </p>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/70 p-6 dark:border-slate-800/50 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Freshness matters</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Highlight new launches or data drops.</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Publish quarterly updates, share screenshots of live pockets, or quote our AI spending insights to signal recency. We
                announce major releases inside our Discord and partner newsletter first.
              </p>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/70 p-6 dark:border-slate-800/50 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Quality outbound links</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Cite authoritative sources alongside us.</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Pair your Moneko mention with trusted industry references to boost credibility. We curated a few below—feel free to mix
                in regional regulators or accredited institutions relevant to your audience.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Reference library</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Authoritative backlink resources</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  When covering Moneko, reinforce your narrative with research from reputable organizations. These links open in a new
                  tab so you can quickly cite guidelines while drafting your content.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {backlinkReferences.map((resource) => (
                <a
                  key={resource.url}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/40 bg-white/90 p-4 text-sm text-slate-700 shadow md:h-full md:p-5 dark:border-slate-800/40 dark:bg-slate-900 dark:text-slate-200"
                >
                  <p className="font-semibold text-slate-900 dark:text-white">{resource.label}</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{resource.description}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-primary">
                    Visit resource <span aria-hidden="true">↗</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Deep Dive 4: Comparison (Why us) */}
        <ComparisonTable />

        <FAQSection />

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}