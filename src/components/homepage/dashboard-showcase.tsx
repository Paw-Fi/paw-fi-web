import  { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
// Import WebP images with PNG fallback
import monekoImgWebp from "@/assets/images/home-showcase/moneko-ai.webp"
import monekoImgPng from "@/assets/images/home-showcase/moneko-ai.png"
import goalImgWebp from "@/assets/images/home-showcase/dashboard-goal-tracker.webp"
import goalImgPng from "@/assets/images/home-showcase/dashboard-goal-tracker.png"
import portfolioImgWebp from "@/assets/images/home-showcase/dashboard-porfolio.webp"
import portfolioImgPng from "@/assets/images/home-showcase/dashboard-porfolio.png"
import learningImgWebp from "@/assets/images/home-showcase/dashboard-learning.webp"
import learningImgPng from "@/assets/images/home-showcase/dashboard-learning.png"

const features = [
  {
    id: "budget-planner",
    title: "Budget Planner",
    description: "Create a realistic monthly plan with clear categories and AI tips that help you adjust over time.",
    imageWebp: goalImgWebp,
    imagePng: goalImgPng,
  },
  {
    id: "savings-goals",
    title: "Savings Goals",
    description: "Set target amounts and timeframes, then see how much to set aside each month to stay on track.",
    imageWebp: monekoImgWebp,
    imagePng: monekoImgPng,
  },
  {
    id: "spending-overview",
    title: "Spending Overview",
    description: "Understand fixed vs variable costs and keep an eye on subscriptions with simple, visual summaries.",
    imageWebp: portfolioImgWebp,
    imagePng: portfolioImgPng,
  },
  {
    id: "learning",
    title: "Budgeting Lessons",
    description: "Short, practical lessons on budgeting basics, cutting spending leaks, and building money habits.",
    imageWebp: learningImgWebp,
    imagePng: learningImgPng,
  }
];

export function DashboardShowcase() {
  const [selectedFeature, setSelectedFeature] = useState(features[3]);

  return (
    <section className="relative z-10 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2
            className="text-foreground mb-6 text-4xl leading-tight font-bold sm:text-5xl md:text-6xl font-lato"
          >
            Your AI Budgeting Dashboard
          </h2>
          
          <p
            className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed font-lato"
          >
            Build a clear monthly plan, set savings goals, and learn practical budgeting skills with guided AI support.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          className="mb-12"
        >
          <div className="flex flex-wrap justify-center gap-2 p-2 backdrop-blur-xl rounded-2xl border border-white/20">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  selectedFeature.id === feature.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {feature.title}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Display */}
        <div
          className="relative"
        >
          {/* Browser Frame */}
          <div className="backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-6">
                <div className="rounded-lg px-4 py-2 text-sm text-muted-foreground border border-white/20">
                  moneko.io/dashboard
                </div>
              </div>
              <div />
            </div>

            {/* Dashboard Content */}
            <div className="relative">
              <div
                key={selectedFeature.id}
                className="relative"
              >
                <picture>
                  <source srcSet={selectedFeature.imageWebp} type="image/webp" />
                  <img
                    src={selectedFeature.imagePng}
                    alt={selectedFeature.title}
                    className="w-full h-auto object-cover"
                  />
                </picture>
              </div>
            </div>
          </div>

          {/* Feature Description */}
          <div
            key={selectedFeature.id}
            className="mt-8 text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4 font-lato">
              {selectedFeature.title}
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto mb-8 font-lato">
              {selectedFeature.description}
            </p>
            <Button 
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <Link to="/dashboard">
                Try {selectedFeature.title}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
