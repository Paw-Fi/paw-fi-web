"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRemainingSpots } from "@/hooks/use-early-access";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import icon from "@/assets/images/pawfi-icon.png"
import { OptimizedImage } from "@/components/seo/optimized-image";

const SPOTS = 100;
const CAMPAIGN_END_DATE = new Date('2025-09-30T23:59:59.999Z');

export const Route = createFileRoute("/early-access")({
  component: EarlyAccessPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/early-access");
    const title = "Get Early Access to Moneko - Limited Spots Available!";
    const description =
      `Join the exclusive early access program for Moneko! Only ${SPOTS} spots available. Get premium features, personalized financial guidance, and be part of shaping the future of financial education.`;
    const keywords =
      "early access, financial education, premium features, limited spots, financial planning, investing app, personal finance";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

// Apple-like easing curves following design system

const features = [
  {
    title: "AI-Powered Personal Coach",
    description: "Get personalized financial advice tailored to your goals",
    premium: true,
  },
  {
    title: "Advanced Analytics", 
    description: "Track your progress with detailed insights and predictions",
    premium: true,
  },
  {
    title: "Exclusive Rewards",
    description: "Unlock premium badges and achievements", 
    premium: true,
  },
  {
    title: "Priority Support",
    description: "Direct access to our financial experts",
    premium: true,
  },
];

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const campaignEnd = CAMPAIGN_END_DATE.getTime();
      const difference = campaignEnd - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, []);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <div className="text-center">
        <div className="text-2xl font-light text-muted-foreground mb-4">Campaign Ended</div>
        <div className="text-lg text-muted-foreground">
          Thank you for your interest! Stay tuned for future opportunities.
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 sm:gap-6">
      {Object.entries(timeLeft).filter(([unit]) => unit !== "seconds").map(([unit, value]) => (
        <div
          key={unit}
          className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 sm:p-6 backdrop-blur-xl min-w-[70px] sm:min-w-[90px] border border-purple-500/30 shadow-lg shadow-purple-500/10"
        >
          <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">{String(value).padStart(2, '0')}</div>
          <div className="text-xs sm:text-sm text-purple-200 capitalize">{unit}</div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = ((total - current) / total) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-purple-200">Progress</span>
        <span className="text-white font-medium">
          {total - current} / {total} claimed
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 shadow-lg shadow-purple-500/50 transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-3 text-center text-sm text-purple-200">
        {current} spots remaining
      </div>
    </div>
  );
}

export default function EarlyAccessPage() {
  const navigate = useNavigate();
  const { data: remainingSpots = 0, isLoading: spotsLoading } = useRemainingSpots();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Simple Background */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Static gradient overlay for visual depth without animation */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/80" />
      </div>

      {/* Header - Simple and clean */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OptimizedImage src={icon} alt="Moneko" className="size-8 rounded-lg" />
              <span className="text-xl font-medium text-foreground">Moneko</span>
            </div>
            <button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section - Simplified without heavy animations */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="mb-8 inline-flex items-center rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 px-8 py-4 text-white backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                  <span className="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-medium">
                    Limited Time Offer - Only {remainingSpots} Spots Left!
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent md:text-7xl leading-tight">
                  Free Trial Giveaway
                </h1>
              </div>

              <p className="mb-16 text-xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
                Be among the first 100 pioneers to experience the future of investing for beginners. Your journey to building your first portfolio starts here.
              </p>

              <div className="mb-20">
                <ProgressBar current={spotsLoading ? SPOTS : remainingSpots} total={SPOTS} />
              </div>

              <div className="mb-16">
                <CountdownTimer />
              </div>

              <div className="max-w-2xl mx-auto">
                <FreeTrialGiveawayForm />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Simplified */}
        <section className="px-8 py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="mb-16 text-center text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Exclusive Premium Features
            </h2>

            <div className="grid gap-8 md:grid-cols-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-sm h-full hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                      <div className="text-purple-200 text-lg font-medium">
                        {feature.title.charAt(0)}
                      </div>
                    </div>
                    <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-xs font-medium shadow-lg">
                      PREMIUM
                    </div>
                  </div>
                  <h3 className="mb-4 text-xl font-medium text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof - Simplified */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 rounded-3xl p-12 backdrop-blur-sm border border-purple-500/20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 text-center border border-green-500/30 backdrop-blur-sm">
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">5000+</div>
                  <div className="text-green-200">People Waiting</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 text-center border border-blue-500/30 backdrop-blur-sm">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    {SPOTS - remainingSpots}
                  </div>
                  <div className="text-blue-200">Already Joined</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 text-center border border-purple-500/30 backdrop-blur-sm">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">98%</div>
                  <div className="text-purple-200">Satisfaction Rate</div>
                </div>
              </div>
              <p className="text-center text-gray-300 leading-relaxed text-lg">
                Join thousands of users who are already improving their financial future with Moneko
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}