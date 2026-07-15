"use client";

import { HomeHeader } from "@/components/index/header";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import { FeaturesBentoGrid } from "@/components/homepage/features-bento-grid";
import { Footer } from "@/components/homepage/footer";
import { BudgetingComparisonLinks } from "@/components/geo/budgeting-comparison-links";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import HeroSection from "@/components/homepage/new/hero-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import VideoSection from "@/components/homepage/new/video-section";
import FAQSection from "@/components/homepage/new/faq-section";
import AmbientHalo from "@/components/ui/ambient-halo";
import { Route } from "@/routes/budgeting-app/index";

export function BudgetingAppRouteComponent() {
  const pageData = Route.useLoaderData() as any;

  return (
    <div className="bg-moneko-background relative min-h-screen">
      <AmbientHalo />

      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      <section className="relative">
        <HeroSection data={pageData} />
      </section>

      <section className="bg-section-bg-light relative">
        <VideoSection data={pageData} />
      </section>

      <section className="bg-section-bg-light relative">
        <FeaturesBentoGrid />
      </section>

      <section className="bg-section-bg-light relative">
        <DashboardShowcase />
      </section>

      <section className="bg-section-bg-light relative">
        <ThreeStepsSection data={pageData} />
      </section>

      <section className="bg-section-bg-light relative">
        <ExpertLessonsSection data={pageData} />
      </section>

      <section className="relative">
        <FAQSection />
      </section>

      <BudgetingComparisonLinks />
      <Footer />
    </div>
  );
}
