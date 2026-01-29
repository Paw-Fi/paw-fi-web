"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { RetroBeeperSection } from "@/components/download/retro-beeper-section";
import FAQSection, { FAQItem } from "@/components/homepage/new/faq-section";

const META_TITLE = "Download Moneko - iOS & Android";
const META_DESCRIPTION = "Download Moneko on your iPhone or Android device. Experience the future of AI budgeting with seamless sync across all your devices.";
const META_KEYWORDS =
  "download moneko, moneko app, budgeting app ios, budgeting app android, expense tracker app, digital envelope budgeting app, couples budgeting app, whatsapp expense tracker";

const downloadFaqItems: FAQItem[] = [
  {
    id: "download-platforms",
    question: "Is Moneko available on iPhone and Android?",
    answer: "Yes. You can download Moneko for iOS or Android from the links on this page.",
  },
  {
    id: "download-what-next",
    question: "What can I do after I download Moneko?",
    answer: "You can track expenses, organize budgets with the Pockets system, and manage shared spending with Household Mode.",
  },
  {
    id: "download-household",
    question: "Does Moneko support shared budgets for couples or households?",
    answer: "Yes. Moneko includes Household Mode for shared bills and joint expense tracking.",
  },
];

export const Route = createFileRoute("/download")({
  component: DownloadPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/download");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: META_TITLE,
          description: META_DESCRIPTION,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://moneko.io" },
              { "@type": "ListItem", position: 2, name: "Download" },
            ],
          },
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko",
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is Moneko available on iPhone and Android?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can download Moneko for iOS or Android from the links on this page.",
              },
            },
            {
              "@type": "Question",
              name: "What can I do after I download Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "You can track expenses, organize budgets with the Pockets system, and manage shared spending with Household Mode.",
              },
            },
            {
              "@type": "Question",
              name: "Does Moneko support shared budgets for couples or households?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Moneko includes Household Mode for shared bills and joint expense tracking.",
              },
            },
          ],
        },
      ],
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

export default function DownloadPage() {
  return (
    <div className="relative min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <link rel="canonical" href={getCanonicalUrl("/download")} />
      </Helmet>

      <AmbientHalo />
      <HomeHeader />

      <main className="flex-1 pb-24">

        {/* Retro Beeper Section */}
        <RetroBeeperSection />

        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Download the Moneko budgeting app</h2>
            <p className="mt-4 text-muted-foreground max-w-3xl">
              Moneko is a modern expense tracker and budgeting app designed for everyday use on iPhone and Android.
              Use it to organize spending into purposeful categories, stay on top of bills, and make smarter decisions with AI-powered insights.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-white/10 bg-muted/30 p-6">
                <h3 className="text-lg font-semibold">Budgeting with Pockets</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Plan and allocate money using a digital envelope system that makes spending limits easy to see.
                </p>
                <Link to="/features/pockets-system" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
                  Learn about the Pockets System
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-muted/30 p-6">
                <h3 className="text-lg font-semibold">Household Mode</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A joint expense tracker for couples and households—track shared bills without losing personal privacy.
                </p>
                <Link to="/features/household-mode" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
                  See how Household Mode works
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-muted/30 p-6">
                <h3 className="text-lg font-semibold">AI insights & forecasting</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask questions about your money, spot trends, and plan ahead with scenario-based insights.
                </p>
                <Link to="/features/ai-insights" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
                  Explore AI Insights
                </Link>
              </div>
            </div>

            <div className="mt-14">
              <FAQSection
                items={downloadFaqItems}
                eyebrowText="Download FAQ"
                title="Common questions before you install"
                subtitle="Quick answers about downloading Moneko for iOS and Android."
                sectionClassName="min-h-0 px-0 py-0"
              />
            </div>           
        
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 text-center flex justify-center w-full">
            <div className="max-w-4xl mx-auto space-y-8 bg-gradient-to-b from-muted/50 to-muted/10 p-12 rounded-[3rem] border border-white/5 backdrop-blur-sm">
                 <h3 className="text-3xl md:text-4xl font-bold">Ready to take control?</h3>
                 <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Download Moneko today and experience the clarity of money management done right.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <AppleDownloadButton className="h-[60px] w-full sm:w-auto text-lg" />
                    <AndroidDownloadButton className="h-[60px] w-full sm:w-auto text-lg" />
                </div>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

