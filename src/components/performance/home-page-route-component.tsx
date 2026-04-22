"use client";

import { Suspense, lazy } from "react";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";

// V2 Components
import { HeroV2 } from "@/components/homepage/v2/hero-v2";

// Existing Components
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";

const UserCommunityShowcase = lazy(() =>
  import("@/components/homepage/user-community-showcase").then((module) => ({
    default: module.UserCommunityShowcase,
  })),
);
const MobileAppPreviewCarousel = lazy(() =>
  import("@/components/shared/mobile-app-preview-carousel").then((module) => ({
    default: module.MobileAppPreviewCarousel,
  })),
);
const CaptureSection = lazy(() =>
  import("@/components/homepage/v2/capture-section").then((module) => ({
    default: module.CaptureSection,
  })),
);
const FeaturesSection = lazy(() =>
  import("@/components/homepage/v2/features-section").then((module) => ({
    default: module.FeaturesSection,
  })),
);
const ProductOverviewSection = lazy(() =>
  import("@/components/homepage/v2/product-overview-section").then(
    (module) => ({
      default: module.ProductOverviewSection,
    }),
  ),
);
const HowItWorksSection = lazy(() =>
  import("@/components/homepage/v2/how-it-works-section").then((module) => ({
    default: module.HowItWorksSection,
  })),
);
const DataOwnershipSection = lazy(() =>
  import("@/components/sections/data-ownership-section").then((module) => ({
    default: module.DataOwnershipSection,
  })),
);
const ComparisonTable = lazy(() =>
  import("@/components/homepage/v2/comparison-table").then((module) => ({
    default: module.ComparisonTable,
  })),
);
const FAQSection = lazy(() => import("@/components/homepage/new/faq-section"));
const CTASection = lazy(() =>
  import("@/components/homepage/v2/cta-section").then((module) => ({
    default: module.CTASection,
  })),
);

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export function HomePageRouteComponent() {
  const deferredSectionFallback =
    "mx-auto my-6 w-full max-w-6xl rounded-[32px] border border-border/40 bg-background/60 p-10";

  return (
    <div className="bg-background selection:bg-primary/20 relative min-h-screen font-sans">
      <AmbientHalo />

      <HomeHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroV2 />

 <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[32rem]`} />
          }
        >
          <MobileAppPreviewCarousel
            title="A smarter way to track every expense"
            description="Add expenses by chat, follow your spending in real time, and get a clearer view of where your money goes—without the friction of traditional budgeting apps."
          />
        </Suspense>
        {/* Core Features Bento Grid (Pockets, Households, Insights) */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[28rem]`} />
          }
        >
          <FeaturesSection />
        </Suspense>

        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[42rem]`} />
          }
        >
          <ProductOverviewSection />
        </Suspense>

       

        {/* Social Proof: User Reviews & Ratings */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[28rem]`} />
          }
        >
          <UserCommunityShowcase />
        </Suspense>

        {/* Deep Dive 2: Capture (The Magic) */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[32rem]`} />
          }
        >
          <CaptureSection />
        </Suspense>

        {/* Deep Dive 1: How it Works (Workflow) */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[32rem]`} />
          }
        >
          <HowItWorksSection />
        </Suspense>

        {/* Data Ownership Section - Trust & Safety */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[18rem]`} />
          }
        >
          <DataOwnershipSection />
        </Suspense>

        {/* Deep Dive 4: Comparison (Why us) */}
        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[28rem]`} />
          }
        >
          <ComparisonTable />
        </Suspense>

        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[24rem]`} />
          }
        >
          <FAQSection />
        </Suspense>

        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[18rem]`} />
          }
        >
          <CTASection />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
