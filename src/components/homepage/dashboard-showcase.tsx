import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
// Import WebP images with PNG fallback
import monekoImgWebp from "@/assets/images/home-showcase/moneko-ai.webp";
import monekoImgPng from "@/assets/images/home-showcase/moneko-ai.png";
import goalImgWebp from "@/assets/images/home-showcase/dashboard-goal-tracker.webp";
import goalImgPng from "@/assets/images/home-showcase/dashboard-goal-tracker.png";
import portfolioImgWebp from "@/assets/images/home-showcase/dashboard-porfolio.webp";
import portfolioImgPng from "@/assets/images/home-showcase/dashboard-porfolio.png";
import learningImgWebp from "@/assets/images/home-showcase/dashboard-learning.webp";
import learningImgPng from "@/assets/images/home-showcase/dashboard-learning.png";

const features = [
  {
    id: "budget-planner",
    title: "Budget Planner",
    routeLink: "/tracker",
    description:
      "Create a realistic monthly plan with clear categories and AI tips that help you adjust over time.",
    imageWebp: goalImgWebp,
    imagePng: goalImgPng,
  },
  {
    id: "savings-goals",
    title: "Savings Goals",
    routeLink: "/tracker",
    description:
      "Set target amounts and timeframes, then see how much to set aside each month to stay on track.",
    imageWebp: monekoImgWebp,
    imagePng: monekoImgPng,
  },
  {
    id: "spending-overview",
    title: "Spending Overview",
    routeLink: "/portfolio",
    description:
      "Understand fixed vs variable costs and keep an eye on subscriptions with simple, visual summaries.",
    imageWebp: portfolioImgWebp,
    imagePng: portfolioImgPng,
  },
  {
    id: "learning",
    title: "Budgeting Lessons",
    routeLink: "/learning",
    description:
      "Short, practical lessons on budgeting basics, cutting spending leaks, and building money habits.",
    imageWebp: learningImgWebp,
    imagePng: learningImgPng,
  },
];

export function DashboardShowcase() {
  const [selectedFeature, setSelectedFeature] = useState(features[3]);

  return (
    <section className="relative z-10 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-foreground font-lato mb-6 text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
            Your AI Budgeting Dashboard
          </h2>

          <p className="text-muted-foreground font-lato mx-auto max-w-3xl text-xl leading-relaxed">
            Build a clear monthly plan, set savings goals, and learn practical
            budgeting skills with guided AI support.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-white/20 p-2 backdrop-blur-xl">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  selectedFeature.id === feature.id
                    ? "bg-primary text-primary-foreground shadow-lg dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {feature.title}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Display */}
        <div className="relative">
          {/* Browser Frame */}
          <div className="overflow-hidden rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl">
            {/* Browser Header */}
            <div className="flex items-center justify-between border-b border-white/20 px-6 py-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="mx-6 flex-1">
                <div className="text-muted-foreground rounded-lg border border-white/20 px-4 py-2 text-sm">
                  moneko.io{selectedFeature.routeLink}
                </div>
              </div>
              <div />
            </div>

            {/* Dashboard Content */}
            <div className="relative">
              <div key={selectedFeature.id} className="relative">
                <picture>
                  <source
                    srcSet={selectedFeature.imageWebp}
                    type="image/webp"
                  />
                  <img
                    src={selectedFeature.imagePng}
                    alt={selectedFeature.title}
                    className="h-auto w-full object-cover"
                    width={1280}
                    height={720}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>
          </div>

          {/* Feature Description */}
          <div key={selectedFeature.id} className="mt-8 text-center">
            <h3 className="text-foreground font-lato mb-4 text-2xl font-bold">
              {selectedFeature.title}
            </h3>
            <p className="text-muted-foreground font-lato mx-auto mb-8 max-w-3xl text-lg leading-relaxed">
              {selectedFeature.description}
            </p>
            <Button
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <Link to="/how-it-works">Try {selectedFeature.title}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
