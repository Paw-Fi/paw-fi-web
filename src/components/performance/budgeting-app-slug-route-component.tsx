"use client";

import { Link } from "@tanstack/react-router";
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
import { Route } from "@/routes/budgeting-app/$slug";

interface CompetitorArticleSectionProps {
  article?: {
    title: string;
    tags?: string[];
    body: string;
  };
}

export function BudgetingAppSlugRouteComponent() {
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

      <CompetitorArticleSection article={pageData.article} />

      <section className="bg-section-bg-light relative px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <Link
            to="/budgeting-app"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Explore more budgeting guides
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CompetitorArticleSection({ article }: CompetitorArticleSectionProps) {
  if (!article) {
    return null;
  }

  const paragraphs = article.body.split("\n\n");

  return (
    <section className="bg-section-bg-light relative">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
          {article.title}
        </h2>
        {article.tags && article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="bg-moneko-soft text-moneko-dark rounded-full px-3 py-1 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="prose prose-slate mt-6 max-w-none">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
