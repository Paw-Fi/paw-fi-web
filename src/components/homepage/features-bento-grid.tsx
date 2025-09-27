"use client";

import { useState, useEffect } from "react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInView } from "react-intersection-observer";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { 
  TrendingUp, 
  Target, 
  Brain,
  Zap
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import monekoIcon from "@/assets/images/logo/moneko.png"
import monekoAnimate from "@/assets/images/logo/moneko-avatar.gif"

// AI Chat interface with animations
const AIChat = () => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });
  const [showLoading, setShowLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (inView) {
      // Start loading indicator after 0.5s
      const loadingTimer = setTimeout(() => {
        setShowLoading(true);
      }, 500);

      // Hide loading and start typing after 1.5s total (1s loading)
      const typingTimer = setTimeout(() => {
        setShowLoading(false);
        setShowTyping(true);
      }, 1500);

      return () => {
        clearTimeout(loadingTimer);
        clearTimeout(typingTimer);
      };
    }
  }, [inView]);

  return (
    <div ref={ref} className="h-full w-full flex flex-col p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30">
      {/* Chat Messages */}
      <div className="flex-1 space-y-4 min-h-0 overflow-hidden">
        {/* User Message - Top Right */}
        <div className="flex items-start gap-3 justify-end">
          <div className="bg-card rounded-2xl p-4 max-w-[85%] shadow-sm">
            <p className="text-sm text-foreground">
              Help me create a budget for saving $10,000 this year
            </p>
          </div>
          <Avatar className="size-9 flex-shrink-0">
            <AvatarImage src="https://randomuser.me/api/portraits/women/3.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
        
        {/* AI Response - Bottom Left */}
        <div className="flex items-start gap-3">
          <img 
            src={monekoIcon}
            alt="Moneko AI"
            className="flex-shrink-0 size-10 rounded-full"
          />
          <div className="bg-primary rounded-2xl p-4 max-w-[90%] text-primary-foreground shadow-sm">
            {showLoading && !showTyping && (
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs text-primary-foreground/70">Analyzing...</span>
              </div>
            )}
            {showTyping && (
              <TypingAnimation 
                className="text-sm font-normal" 
                duration={20}
                startOnView={false}
              >
Based on your financial patterns and preferences, I recommend creating a budget that allocates 20% for savings, 50% for essential expenses, and 30% for discretionary spending, such as entertainment, hobbies, and personal goals              </TypingAnimation>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Small dot + pill tag used in feature orbits (design-system compliant)
const FeatureTag = ({ label }: { label: string }) => (
  <div className="relative flex h-full !w-64 items-center justify-center">
    <span
      aria-hidden="true"
      className="block h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/30"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="absolute left-full ml-2 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium border border-white/20 dark:border-slate-800/50 shadow-sm text-foreground"
    >
      {label}
    </Badge>
  </div>
);

// Dashboard Features Orbit with pill-style tags
const TechStack = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Use a more reasonable speed reduction or disable animation entirely
  const motionSpeed = prefersReducedMotion ? 0 : 1; // 0 = no animation, 1 = normal speed
  
  return (
    <div className="relative h-full w-full bg-subtle-background overflow-hidden">
      {/* Full container for orbiting tags */}
      <div className="absolute inset-0 flex items-center justify-center top-24 lg:top-12 scale-100 lg:scale-115">
        {/* Center Logo */}
        <div className="relative z-20 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg ring-8 ring-primary/10">
          <img src={monekoAnimate} alt="Moneko" className="h-14 w-14 rounded-full" />
        </div>

        {/* Only render orbiting circles if animation is enabled */}
        {motionSpeed > 0 && (
          <>
            {/* Inner Ring */}
            <OrbitingCircles iconSize={16} radius={90} duration={27} path speed={motionSpeed}>
              <FeatureTag label="Emergency fund?" />
              <FeatureTag label="Smart Saving?" />
            </OrbitingCircles>

            {/* Outer Ring */}
            <OrbitingCircles iconSize={16} radius={120} duration={32} reverse path speed={motionSpeed}>
              <FeatureTag label="Goal Plan?" />
              <FeatureTag label="Budget tips?" />
            </OrbitingCircles>

             {/* Outer Ring */}
             <OrbitingCircles iconSize={16} radius={160} duration={21} reverse path speed={motionSpeed}>
              <FeatureTag label="Bad Debt?" />
              <FeatureTag label="Investment?" />
            </OrbitingCircles>
          </>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-20 left-0 h-20 w-full bg-gradient-to-t from-background to-transparent z-20"></div>
    </div>
  );
};

// Portfolio Growth Area Chart
const FinancialGrowth = () => {
  const portfolioData = [
    { month: "Jan", withMoneko: 25000, withoutMoneko: 10000 },
    { month: "Feb", withMoneko: 29000, withoutMoneko: 12200 },
    { month: "Mar", withMoneko: 24000, withoutMoneko: 8500 },
    { month: "Apr", withMoneko: 38000, withoutMoneko: 14000 },
    { month: "May", withMoneko: 35000, withoutMoneko: 15800 },
    { month: "Jun", withMoneko: 44000, withoutMoneko: 22500 },
  ];

  const chartConfig = {
    withMoneko: {
      label: "With Moneko",
      // Use success green from design tokens
      color: "var(--chart-success)",
    },
    withoutMoneko: {
      label: "Traditional",
      // Muted foreground for baseline comparison
      color: "hsl(var(--muted-foreground))",
    },
  } satisfies ChartConfig;

  return (
    <div className="h-full w-full p-4 bg-green-50/40 dark:bg-green-950/20">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-medium text-foreground mb-2">Portfolio Growth</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-light text-primary">$42,000</span>
            <span className="text-xs text-muted-foreground">+171%</span>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-full -translate-y-20">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              accessibilityLayer
              data={portfolioData}
              margin={{ left: 12, right: 12, top: 12, bottom: 16 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(v) => String(v).slice(0, 3)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              {/* Baseline (Traditional) */}
              <Area
                dataKey="withoutMoneko"
                type="natural"
                strokeWidth={2}
                strokeOpacity={0.5}
                fill="var(--color-withoutMoneko)"
                fillOpacity={0.12}
                stroke="var(--color-withoutMoneko)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              {/* With Moneko - success green */}
              <Area
                dataKey="withMoneko"
                type="natural"
                strokeWidth={2}
                strokeOpacity={0.9}
                fill="var(--color-withMoneko)"
                fillOpacity={0.35}
                stroke="var(--color-withMoneko)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
};


// Financial Health Radar Chart
const FinancialHealth = () => {
  const healthData = [
    { category: "Savings", score: 85, maxScore: 100 },
    { category: "Investments", score: 72, maxScore: 100 },
    { category: "Debt Management", score: 90, maxScore: 100 },
    { category: "Emergency Fund", score: 95, maxScore: 100 },
    { category: "Budget Control", score: 78, maxScore: 100 },
    { category: "Credit Score", score: 88, maxScore: 100 },
  ];

  const chartConfig = {
    score: {
      label: "Score",
      color: "var(--chart-primary)",
    },
    maxScore: {
      label: "Max Score",
      color: "var(--chart-primary-transparent)",
    },
  } satisfies ChartConfig;

  return (
    <div className="h-full w-full p-4 bg-purple-50/50 dark:bg-purple-950/30">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="font-medium text-foreground mb-1">Financial Health</h3>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-xl font-light text-primary">84.7</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        
        {/* Radar Chart */}
        <div className="flex-1">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-60 w-80 lg:w-96"
          >
            <RadarChart
              data={healthData}
              margin={{
                top: 10,
                right: 10,
                bottom: 10,
                left: 10,
              }}
            >
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <PolarAngleAxis
                dataKey="category"
                tick={({ x, y, textAnchor, value, index, ...props }) => {
                  const data = healthData[index];
                  return (
                    <text
                      x={x}
                      y={index === 0 ? y - 10 : y}
                      textAnchor={textAnchor}
                      fontSize={10}
                      fontWeight={500}
                      {...props}
                    >
                      <tspan className="fill-muted-foreground">
                        {data.category}
                      </tspan>
                    </text>
                  );
                }}
              />
              <PolarGrid />
              <Radar
                dataKey="score"
                fill="var(--color-score)"
                fillOpacity={0.6}
                stroke="var(--color-score)"
                strokeWidth={2}
              />
            </RadarChart>
          </ChartContainer>
        </div>
        
        {/* Footer */}
        <div className="mt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Excellent financial health</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const features = [
  {
    Icon: Brain,
    name: "AI Financial Coaching",
    description: "Chat with our intelligent AI advisor for personalized financial guidance",
    href: "/dashboard",
    cta: "Chat with AI",
    component: <AIChat />,
    className: "lg:col-span-1 lg:row-span-1 h-[420px]",
  },
  {
    Icon: Zap,
    name: "Ask Moneko AI Anything", 
    description: "Get instant, helpful answers to beginner finance questions",
    href: "/dashboard",
    cta: "Explore Platform",
    component: <TechStack />,
    className: "lg:col-span-1 lg:row-span-1 h-[420px]",
  },
  {
    Icon: TrendingUp,
    name: "Portfolio Growth",
    description: "Track your investment portfolio with professional analytics and insights",
    href: "/dashboard/portfolio", 
    cta: "View Analytics",
    component: <FinancialGrowth />,
    className: "lg:col-span-1 lg:row-span-1 h-[420px]",
  },
  {
    Icon: Target,
    name: "Financial Health",
    description: "Monitor your overall financial wellness across multiple categories",
    href: "/dashboard/portfolio",
    cta: "View Health",
    component: <FinancialHealth />,
    className: "lg:col-span-1 lg:row-span-1 h-[420px]",
  },
];

export function FeaturesBentoGrid() {
  return (
    <section className="relative z-10 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-6 text-4xl leading-tight font-bold sm:text-5xl md:text-6xl font-lato">
            Everything You Need for Financial Success
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed font-lato">
            Experience comprehensive financial management with AI-powered insights, goal tracking, 
            portfolio analytics, and personalized education in one integrated platform.
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid className="lg:grid-cols-2 lg:grid-rows-2 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden">
          {features.map((feature) => (
            <BentoCard
              key={feature.name}
              {...feature}
              className={feature.className}
            />
          ))}
        </BentoGrid>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Button asChild size="lg" className="px-8 py-3 text-lg font-semibold">
            <Link to="/dashboard">
              Start Your Financial Journey
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Free forever • No credit card required • Start in 30 seconds
          </p>
        </div>
      </div>
    </section>
  );
}