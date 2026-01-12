"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Camera, Shield, Smartphone, Check, Code, Rocket, Palette, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { ArcTimeline, type ArcTimelineItem } from "@/components/ui/arc-timeline";
import { FaqSection } from "@/components/ui/faq-section";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { cn } from "@/lib/utils";
import phone1 from "@assets/images/early-access/Mobile-Screen1.png"
import phone2 from "@assets/images/early-access/Mobile-Screen2.png"
import phone3 from "@assets/images/early-access/Mobile-Screen3.png"
import phone4 from "@assets/images/early-access/Mobile-Screen4.png"
import { MonekoIcon } from "@/components/shared/moneko-icon";

import { claimEarlyAccessSpot, type EarlyAccessClaim } from "@/lib/early-access";
import { useUserHasClaimed } from "@/hooks/use-early-access";
import { useAuth } from "@/contexts/auth-context";
const EXPECTED_LAUNCH = "Coming soon";

export const Route = createFileRoute("/early-access")({
  component: EarlyAccessPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/early-access");
    const title = "Moneko AI Budgeting App | Now in Public Beta on TestFlight";
    const description =
      `Try Moneko’s AI budgeting app in public beta! Track goals, manage money, and get smart insights with the power of AI on TestFlight.`;
    const keywords =
      "moneko mobile app, moneko beta testing, moneko waitlist, moneko early access, mobile budgeting app waitlist, personal finance app, budgeting and expense tracking, goal tracker app, AI financial education, money management tools, moneko dashboard";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          "name": "Moneko",
          "alternateName": "Moneko App",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
          "description": "AI-powered personal finance coach and budgeting app",
          "sameAs": [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          "name": "Moneko",
          "alternateName": "Moneko - AI Personal Finance Coach",
          "url": "https://moneko.io",
          "description": "The official website of Moneko, your AI personal finance coach and budgeting app",
          "publisher": { "@id": "https://moneko.io/#organization" }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": title,
          "description": description,
          "isPartOf": { "@id": "https://moneko.io/#website" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://moneko.io" },
              { "@type": "ListItem", "position": 2, "name": "Moneko Early Access", "item": pageUrl }
            ]
          },
          "inLanguage": "en-US",
          "primaryImageOfPage": "https://moneko.io/og-img.png"
        },
        {
          "@type": "SoftwareApplication",
          "name": "Moneko Mobile App",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "iOS, Android",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": "Moneko's AI-powered mobile budgeting and personal finance app - coming soon"
        },
        {
          "@type": "FAQPage",
          "@id": pageUrl + "#faq",
          "mainEntity": [
            { "@type": "Question", "name": "When will the Moneko mobile app launch?", "acceptedAnswer": { "@type": "Answer", "text": "The Moneko mobile app is in active development. Join the waitlist for updates and early invitations; invites roll out in waves during private beta." } },
            { "@type": "Question", "name": "What can I use in Moneko today?", "acceptedAnswer": { "@type": "Answer", "text": "Use Moneko's live web dashboard for budgeting, goal tracking, AI learning, and calculators while mobile is in development." } },
            { "@type": "Question", "name": "How do I access the Moneko dashboard?", "acceptedAnswer": { "@type": "Answer", "text": "Visit https://moneko.io/dashboard to sign in and get started with Moneko's web platform." } }
          ]
        }
      ]
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

// Apple-like easing curves following design system

const features = [
  {
    title: "Smart Budget Notifications",
    description: "Planned: Helpful alerts when you're approaching budget limits or spending goals.",
    icon: Bell,
    premium: true,
  },
  {
    title: "Photo Receipt Capture", 
    description: "Planned: Track expenses by snapping receipts. AI will help categorize spending.",
    icon: Camera,
    premium: true,
  },
  {
    title: "Biometric Security",
    description: "Planned: Sign in with device-level biometrics and encrypted mobile storage.", 
    icon: Shield,
    premium: true,
  },
  {
    title: "Offline Budget Access",
    description: "Planned: View budgets and track expenses without an internet connection.",
    icon: Smartphone,
    premium: true,
  },
];

// Early Access FAQ content (kept factual, non-promissory)
const earlyAccessFaq = [
  {
    question: "When will the mobile app launch?",
    answer:
      "The mobile app is in active development. Join the waitlist for updates and early invitations. Invites roll out in waves during private beta.",
  },
  {
    question: "What can I use today?",
    answer:
      "You can use the live web dashboard for budgeting, goal tracking, AI learning, and calculators while mobile is in development.",
  },
  {
    question: "How do I access the dashboard?",
    answer:
      "Head to /dashboard to sign in and get started.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as any,
    },
  },
};

// Mobile preview cards data (moved out of JSX for reuse)
const mobilePreview = [
  { src: phone1, title: "Chat with AI to log expenses instantly.", description: "Log expenses or income with natural language and quick taps." },
  { src: phone2, title: "AI tracks, sorts, and surfaces top spending.", description: "Automatically categorize spending and show top categories." },
  { src: phone3, title: "Stay notified on paychecks and bills.", description: "Get notified about upcoming paychecks and bills." },
  { src: phone4, title: "Set goals, track growth, celebrate success.", description: "Set, track, and celebrate your financial milestones." },
];

function DevelopmentTimeline() {
  const timelineData: ArcTimelineItem[] = [
    {
      time: "Design & Planning",
      steps: [
        {
          icon: <Palette className="w-6 h-6" />,
          content: "Mobile-first design and research with seamless desktop sync."
        },
        {
          icon: <Check className="w-6 h-6" />,
          content: "Architecture and product roadmap defined."
        }
      ]
    },
    {
      time: "Development",
      steps: [
        {
          icon: <Code className="w-6 h-6" />,
          content: "Core mobile experience in progress — authentication, budgeting, and expense tracking."
        },
        {
          icon: <Camera className="w-6 h-6" />,
          content: "Receipt scanning with AI categorization (planned)."
        }
      ]
    },
    {
      time: "Beta & Launch",
      steps: [
        {
          icon: <TestTube className="w-6 h-6" />,
          content: "Public beta now open on TestFlight."
        },
        {
          icon: <Bell className="w-6 h-6" />,
          content: "Smart notifications and helpful alerts (planned)."
        },
        {
          icon: <Rocket className="w-6 h-6" />,
          content: "Public release when ready."
        }
      ]
    }
  ];

  return (
    <motion.div 
      className="w-full max-w-4xl mx-auto"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >           
      <div className="relative">
        <ArcTimeline 
          data={timelineData}
          className="mb-4"
          defaultActiveStep={{ time: "Beta & Launch", stepIndex: 0 }}
          arcConfig={{
            circleWidth: 5000,
            angleBetweenMinorSteps: 0.35,
            lineCountFillBetweenSteps: 10,
            boundaryPlaceholderLinesCount: 50
          }}
        />
      </div>      
     
    </motion.div>
  );
}

function CommunityGrowth({ userCount }: { userCount: number }) {
  return (
    <motion.div 
      className="w-full max-w-md mx-auto text-center"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-6">
        <motion.div 
          className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.3, delay: 0.2 }}
        >
          {userCount.toLocaleString()}+
        </motion.div>
        <div className="text-lg text-slate-600 dark:text-slate-400 font-medium mb-4">
          Users waiting for mobile access
        </div>
        
       
      </div>
    </motion.div>
  );
}

export default function EarlyAccessPage() {
  const navigate = useNavigate();
  
  const questions = {
    budgetingMethodOptions: [
      { value: "manual-tracking", label: "Manual tracking (pen and paper)" },
      { value: "spreadsheets", label: "Spreadsheets (Excel, Google Sheets)" },
      { value: "other-apps", label: "Other budgeting apps" },
      { value: "no-system", label: "No organized system currently" },
      { value: "bank-tools", label: "Bank's budgeting tools" },
    ],
    mobileAppPriorities: [
      { id: "quick-expense-tracking", label: "Quick expense entry on-the-go" },
      { id: "budget-notifications", label: "Push notifications for budget alerts" },
      { id: "goal-progress", label: "Real-time goal progress tracking" },
      { id: "offline-access", label: "Offline budget access" },
      { id: "receipt-scanning", label: "Photo receipt capture" },
      { id: "biometric-security", label: "Secure biometric login" },
    ],
    mobileFeatureOptions: [
      { id: "push-notifications", label: "Smart push notifications" },
      { id: "photo-receipts", label: "AI-powered receipt scanning" },
      { id: "biometric-login", label: "Face ID / Touch ID login" },
      { id: "watch-integration", label: "Apple Watch / Wear OS integration" },
      { id: "offline-mode", label: "Full offline functionality" },
      { id: "widget-support", label: "Home screen budget widgets" },
    ],
    referralOptions: [
      { value: "search", label: "Search Engine (Google, Bing, etc.)" },
      { value: "social", label: "Social Media (TikTok, Instagram, etc.)" },
      { value: "friend", label: "Friend or family recommendation" },
      { value: "blog", label: "Blog or news article" },
      { value: "youtube", label: "YouTube" },
      { value: "podcast", label: "Podcast" },
      { value: "other", label: "Other" },
    ],
  };

  const onSubmit = (claim: EarlyAccessClaim) => claimEarlyAccessSpot(claim);
    const { user, isAuthenticated } = useAuth();

  const { data: userHasClaimedFromDB = false, isLoading: claimStatusLoading } = useUserHasClaimed(user?.id);


  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden">
      {/* Background Beams with Collision - Rotated for meteor effect */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen">
        </BackgroundBeamsWithCollision>
     
      
      {/* Dotted grid pattern overlay - exactly like Uninbox */}
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header - Exact Uninbox style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
          <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 px-3 py-2 rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section - Exact Uninbox style */}
        <section className="px-6 py-24 pt-30">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center">              

              <motion.div className="mb-8" variants={itemVariants}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-slate-200 leading-tight tracking-tight">
                Smart Budgeting 
                  <br />
                  <span className="bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">Powered by AI</span>
                </h1>
              </motion.div>

              <motion.p 
                className="mb-10 text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto"
                variants={itemVariants}
              >
                Your AI budgeting assistant — anytime, anywhere. Join the Beta or try the <a className="underline font-semibold" href="/dashboard" target="_blank">web dashboard</a>.
                
              </motion.p>
            
              <motion.div className="mb-16" variants={itemVariants}>
                <DevelopmentTimeline />
              </motion.div>

              <motion.div className="max-w-xl mx-auto" variants={itemVariants}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100/30 via-white/50 to-slate-100/30 dark:from-slate-800/30 dark:via-slate-900/50 dark:to-slate-800/30 rounded-2xl blur-3xl" />
                  <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                    <FreeTrialGiveawayForm questions={questions} onSubmit={onSubmit} userHasClaimedFromDB={userHasClaimedFromDB} claimStatusLoading={claimStatusLoading} />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
  
        {/* Mobile App Preview Section */}
        <section className="px-6 py-20 relative overflow-hidden">
          <motion.div 
            className="max-w-7xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div className="text-center mb-16" variants={itemVariants}>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200 tracking-tight mb-6">
                What You Can Do with Moneko Mobile
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Experience seamless budgeting on your phone with AI-powered features designed for your financial success.
              </p>
            </motion.div>

            {/* Carousel rendering: preserve exact item styles; phone mockup is injected via prop */}
            <Carousel
              className="h-[540px] md:h-[620px] lg:h-[600px] xl:h-[600px] 2xl:h-[700px]"
              items={mobilePreview.map((mockup, index) => (
                <motion.div
                  key={index}
                  className="relative flex flex-col items-center"
                  variants={itemVariants}
                >
                  {/* Content */}
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 -translate-y-8  w-[70%]">
                      {mockup.title}
                    </h3>

                
                </motion.div>
              ))}
              iphoneMockups={mobilePreview.map((mockup) => (
                <motion.div
                  key={(mockup as any).title}
                  className="w-full h-[80%] flex items-end justify-center"
                >
                  <img src={mockup.src} className="h-full w-auto" />
                </motion.div>
              ))}
            />
          </motion.div>

        </section>

        {/* Features Section - Exact Uninbox style */}
        <section className="px-6 py-20">
          <motion.div 
            className="max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.h2 
              className="mb-16 text-center text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200 tracking-tight"
              variants={itemVariants}
            >
              Planned Mobile Budgeting Features
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        PREMIUM
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-200">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
 
        {/* Early Access FAQ (reused component) */}
        <div id="faq">
            <FaqSection faqData={earlyAccessFaq} title="Early Access FAQ" />
        </div>
      </main>
    </div>
  );
}
