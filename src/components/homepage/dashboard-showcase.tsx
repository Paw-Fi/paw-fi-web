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
    id: "ai-coach",
    title: "AI Financial Coach",
    description: "Get personalized financial advice and insights powered by certified CFA professionals. Your AI coach learns your habits and provides tailored recommendations.",
    imageWebp: monekoImgWebp,
    imagePng: monekoImgPng,
    stats: "95% accuracy rate"
  },
  {
    id: "goal-tracking",
    title: "Smart Goal Tracking",
    description: "Set, monitor, and achieve your financial goals with intelligent progress tracking and automated milestone celebrations.",
    imageWebp: goalImgWebp,
    imagePng: goalImgPng,
    stats: "Average $15K saved"
  },
  {
    id: "portfolio",
    title: "Portfolio Analytics",
    description: "Track your investments with real-time performance insights, risk analysis, and automated rebalancing recommendations.",
    imageWebp: portfolioImgWebp,
    imagePng: portfolioImgPng,
    stats: "127% better returns"
  },
  {
    id: "learning",
    title: "Financial Education Hub",
    description: "Learn from expert-led courses, interactive lessons, and personalized learning paths designed by certified professionals.",
    imageWebp: learningImgWebp,
    imagePng: learningImgPng,
    stats: "50+ expert courses"
  }
];

export function DashboardShowcase() {
  const [selectedFeature, setSelectedFeature] = useState(features[0]);

  return (
    <section className="relative z-10 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2
            className="text-foreground mb-6 text-4xl leading-tight font-bold sm:text-5xl md:text-6xl font-lato"
          >
            Your AI-Powered Financial Dashboard
          </h2>
          
          <p
            className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed font-lato"
          >
            Experience comprehensive financial management with AI-powered goal tracking, portfolio analytics, personalized education, and smart insights
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
              <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {selectedFeature.stats}
              </div>
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
