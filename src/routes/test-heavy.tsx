"use client";

import { createFileRoute } from "@tanstack/react-router";
import AmbientHalo from "@/components/ui/ambient-halo";
import { HomeHeader } from "@/components/index/header";
import HeroSection from "@/components/homepage/new/hero-section";
import { FeaturesBentoGrid } from "@/components/homepage/features-bento-grid";
import VideoSection from "@/components/homepage/new/video-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";

export const Route = createFileRoute("/test-heavy")({
  component: TestHeavy,
});

function TestHeavy() {
  return (
    <div className="relative min-h-screen w-full bg-moneko-background dark:bg-dark-background">
      <AmbientHalo />
      <HomeHeader />

      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-center py-8 text-moneko-text dark:text-dark-text">
          Test: Full Index Page Components
        </h1>
        <p className="text-center text-lg mb-8 text-moneko-text-secondary dark:text-dark-text-secondary">
          All the same components as index page - testing if it's the component count
        </p>

        <HeroSection />
        <FeaturesBentoGrid />
        <VideoSection />
        <DashboardShowcase />
        <ThreeStepsSection />
        <ExpertLessonsSection />
        <FAQSection />
        <Footer />
      </div>
    </div>
  );
}
