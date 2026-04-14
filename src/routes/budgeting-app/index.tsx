import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { HomeHeader } from "@/components/index/header";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import { FeaturesBentoGrid } from "@/components/homepage/features-bento-grid";
import { Footer } from "@/components/homepage/footer";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import HeroSection from "@/components/homepage/new/hero-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import VideoSection from "@/components/homepage/new/video-section";
import FAQSection from "@/components/homepage/new/faq-section";
import AmbientHalo from "@/components/ui/ambient-halo";
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";

export const Route = createFileRoute("/budgeting-app/")({
  // Use Streaming SSR for dynamic personalized content
  ssr: true,
  component: BudgetingApp,

  head: () => {
    const pageUrl = getCanonicalUrl("/budgeting-app/");

    // Create SEO metadata
    const meta = seo({
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      description:
        "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
      keywords:
        "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools",
      url: pageUrl,
      image: "https://moneko.io/og-img.png",
    });

    // Create comprehensive structured data with enhanced SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/icon.svg",
            width: "512",
            height: "512",
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          location: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "US",
            },
          },
          areaServed: [
            {
              "@type": "Country",
              name: "United States",
            },
            {
              "@type": "Country",
              name: "Canada",
            },
          ],
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko-ai",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: "https://moneko.io/contact",
            availableLanguage: ["English"],
            serviceArea: {
              "@type": "GeoShape",
              addressCountry: "US",
            },
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "AI Financial Planning Services",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "AI Budgeting Tools",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Financial Education Courses",
                },
              },
            ],
          },
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          publisher: {
            "@id": "https://moneko.io/#organization",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://moneko.io/search?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
          mainEntity: {
            "@id": pageUrl + "#software",
          },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
          description:
            "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
          isPartOf: {
            "@id": "https://moneko.io/#website",
          },
          about: [
            {
              "@type": "Thing",
              name: "Personal Finance Management",
            },
            {
              "@type": "Thing",
              name: "AI Financial Planning",
            },
            {
              "@type": "Thing",
              name: "Budgeting Education",
            },
          ],
          inLanguage: "en-US",
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
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
                name: "AI Budgeting App",
                item: pageUrl,
              },
            ],
          },
          mainEntity: {
            "@id": pageUrl + "#software",
          },
        },
        {
          "@type": "SoftwareApplication",
          "@id": pageUrl + "#software",
          name: "Moneko",
          alternateName: "Moneko Budgeting App",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          operatingSystem: ["Web"],
          description:
            "Budgeting and personal finance tools with guidance and education.",
          url: pageUrl,
          dateCreated: "2024-01-01",
          author: {
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@id": "https://moneko.io/#organization",
          },
          featureList: [
            "Budgeting",
            "Financial calculators",
            "Personal finance education",
          ],
        },
      ],
    };

    return {
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
});

function BudgetingApp() {
  const pageData = passiveIncomeVariants["main"];
  return (
    <div className="bg-moneko-background relative min-h-screen">
      <AmbientHalo />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section - Transparent background with halo */}
      <section className="relative">
        <HeroSection data={pageData} />
      </section>

      {/* Video Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <VideoSection data={pageData} />
      </section>

      {/* Features Bento Grid Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <FeaturesBentoGrid />
      </section>

      {/* DashboardShowcase Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <DashboardShowcase />
      </section>

      {/* Three Steps Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <ThreeStepsSection data={pageData} />
      </section>

      {/* Testimonials Section */}
      {/* <TestimonialsSection /> */}

      {/* Expert-Led Lessons Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <ExpertLessonsSection data={pageData} />
      </section>

      {/* FAQ Section */}
      <section className="relative">
        <FAQSection />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default BudgetingApp;
