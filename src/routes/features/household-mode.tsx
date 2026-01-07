"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Users, Split, HeartHandshake, ShieldCheck, ArrowRightLeft, Lock, Zap, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import ThreeMonekos from "@/assets/images/index/3-moneko.svg";

// SEO & Meta Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const META_TITLE = "Joint Expense Tracker & Budgeting for Couples | Moneko Household";
const META_DESCRIPTION = "The best joint expense tracker for couples. Manage shared household bills, split expenses fairly, and track joint savings without losing your personal privacy.";
const META_KEYWORDS = "joint expense tracker, couples budgeting app, shared household finances, bill splitter for partners, joint budget planner, finance app for couples, split rent and utilities";

export const Route = createFileRoute("/features/household-mode")({
  component: HouseholdFeaturePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/features/household-mode");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-household.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

export default function HouseholdFeaturePage() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/household-mode");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": META_TITLE,
        "description": META_DESCRIPTION,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://moneko.io" },
            { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://moneko.io/features" },
            { "@type": "ListItem", "position": 3, "name": "Household Mode" }
          ]
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Moneko Household Mode",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "iOS, Android",
        "description": "Collaborative financial tool for couples to manage joint expenses and shared household budgets.",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Can my partner see my personal spending in Household Mode?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Moneko is private by default. Your partner can only see transactions that you explicitly add to the Shared Household space."
            }
          },
          {
            "@type": "Question",
            "name": "How does Moneko handle fair bill splitting?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Moneko allows you to split bills by percentage, exact amounts, or shares, making it easy to adjust for different income levels."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden font-sans selection:bg-purple-100 dark:selection:bg-purple-900">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://moneko.io/og-household.png" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Background Decor */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen opacity-40 dark:opacity-20">
         <></>
      </BackgroundBeamsWithCollision>
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header */}
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

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto mb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
                 <Users className="w-4 h-4" />
                 Collaborative Finance for Couples
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Manage <span className="text-purple-600 dark:text-purple-400">Ours</span> <br />
                without losing <span className="relative">Yours.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Stop the "Who owes who?" texts. Moneko is the <strong>joint expense tracker</strong> that 
                keeps shared bills separate from personal spending, giving couples a transparent, 
                stress-free picture of their financial life.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </motion.div>
          </div>
        </section>

        {/* Feature 1: The Orbit */}
        <FeatureBlock
          title="Real-Time Shared Household Budgeting"
          description="Create a unified household hub to track joint expenses like mortgage payments, utilities, and weekly groceries. Instantly see who paid the latest bill and maintain a balanced ledger without manual spreadsheets."
          align="left"
          visual={<HouseholdOrbitVisual />}
        />

        {/* Feature 2: Fair Splitting */}
        <FeatureBlock
          title="Automated & Equitable Bill Splitting"
          description="Financial fairness isn't always 50/50. Moneko offers flexible splitting options—split by income percentage, exact dollar amounts, or custom shares. Perfect for partners with different salary levels."
          align="right"
          visual={<FairSplittingVisual />}
        />

        {/* Feature 3: Instant Settlement */}
        <FeatureBlock
          title="Seamless Monthly Debt Settlements"
          description="Eliminate the friction of small transfers. Moneko keeps a running tally of household debt, allowing you to 'settle up' the entire month's shared expenses with a single, documented transfer."
          align="left"
          visual={<InstantSettlementVisual />}
        />
        
        {/* Feature 4: Private by Default */}
         <FeatureBlock
          title="Privacy-First Individual Tracking"
          description="Autonomy matters. Your personal spending remains strictly private. Only transactions you explicitly 'share' enter the household view, ensuring you can manage personal gifts or hobbies with total discretion."
          align="right"
          visual={<PrivateByDefaultVisual />}
        />

        {/* Methodology Section for SEO E-E-A-T */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">The Science of Shared Finances</h2>
                 <p className="text-slate-600 dark:text-slate-400">Why thousands of couples trust Moneko to manage their household economy.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">Reduces Money Conflict</h3>
                       <p className="text-sm text-slate-500">Automated tracking removes the 'nag factor' from relationship finances.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">Joint Goal Alignment</h3>
                       <p className="text-sm text-slate-500">Collaborate on large purchases like homes or vacations with shared 'Pockets'.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Ready to team up?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">Join over 50,000 users building better financial futures together.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 text-sm">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> End-to-End Encryption</span>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Bank-Level Security</span>
            </div>
         </section>
      </main>
    </div>
  );
}

// --- Layout Components ---

const FeatureBlock = ({ title, description, align, visual }: { title: string, description: string, align: 'left' | 'right', visual: ReactNode }) => {
  return (
    <div className="py-24">
      <div className="container px-4 md:px-6 mx-auto">
        <div className={cn("flex flex-col items-center gap-12 lg:gap-24", align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row')}>
          {/* Text Content */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
          </div>
          
          {/* Visual Content */}
          <div className="flex-1 w-full flex justify-center">
             <div className="relative w-full max-w-[450px] aspect-[4/3] bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
                <div className="relative w-full h-full flex items-center justify-center p-6">
                    {visual}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Visual Components ---

const FeatureTag = ({ label }: { label: string }) => (
  <div className="relative flex h-full !w-64 items-center justify-center">
    <span
      aria-hidden="true"
      className="block h-2 w-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/30"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="absolute left-full ml-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200"
    >
      {label}
    </Badge>
  </div>
);

const HouseholdOrbitVisual = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionSpeed = prefersReducedMotion ? 0 : 1; 

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center top-0 scale-100">
           <div className="relative z-10 p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-purple-100 dark:border-purple-900/50">
                <img src={ThreeMonekos} className="h-20 w-auto" alt="Household Hub" />
           </div>

        <OrbitingCircles iconSize={40} radius={80} duration={30} path speed={motionSpeed}>
            <Avatar className="border-2 border-white shadow-sm w-12 h-12">
                <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
                <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-white shadow-sm w-12 h-12">
                <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
                <AvatarFallback>B</AvatarFallback>
            </Avatar>
        </OrbitingCircles>

        <OrbitingCircles iconSize={10} radius={140} duration={40} reverse path speed={motionSpeed}>
            <FeatureTag label="Rent Split" />
            <FeatureTag label="Joint Savings" />
            <FeatureTag label="Shared Bills" />
            <FeatureTag label="Groceries" />
        </OrbitingCircles>
      </div>
    </div>
  );
};

const FairSplittingVisual = () => {
    return (
        <div className="flex flex-col gap-6 items-center w-full max-w-[300px]">
            <div className="flex -space-x-4">
                <Avatar className="border-4 border-white dark:border-slate-900 w-16 h-16 z-20 shadow-lg"><AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" /><AvatarFallback>A</AvatarFallback></Avatar>
                <Avatar className="border-4 border-white dark:border-slate-900 w-16 h-16 z-10 grayscale opacity-70"><AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" /><AvatarFallback>B</AvatarFallback></Avatar>
            </div>
            
            <div className="w-full space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>You pay 60%</span>
                    <span className="text-slate-400">Partner pays 40%</span>
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <motion.div 
                        initial={{ width: "50%" }}
                        whileInView={{ width: "60%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-indigo-500 relative"
                    >
                         <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white opacity-50" />
                    </motion.div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Grocery Bill</span>
                    <span className="font-bold">$125.00</span>
                </div>
                <div className="flex gap-2 text-xs">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md font-medium">You: $75.00</span>
                    <span className="text-slate-400 py-1">Partner: $50.00</span>
                </div>
            </div>
        </div>
    )
}

const InstantSettlementVisual = () => {
    return (
        <div className="flex items-center gap-6 w-full max-w-[320px]">
             <div className="text-center space-y-2">
                 <Avatar className="w-14 h-14 mx-auto border-2 border-white shadow-sm"><AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" /></Avatar>
                 <p className="font-medium text-sm text-slate-600 dark:text-slate-400">You</p>
            </div>

            <div className="flex-1 flex flex-col items-center gap-3 relative z-10">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
                    Gets $450.00
                </div>
                <motion.div 
                    animate={{ x: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-slate-300 dark:text-slate-600"
                >
                    <ArrowRightLeft className="w-6 h-6" />
                </motion.div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Settling Up</div>
            </div>

            <div className="text-center space-y-2 opacity-75">
                 <Avatar className="w-14 h-14 mx-auto border-2 border-white shadow-sm grayscale"><AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" /></Avatar>
                 <p className="font-medium text-sm text-slate-600 dark:text-slate-400">Partner</p>
            </div>
        </div>
    )
}

const PrivateByDefaultVisual = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
             <div className="relative w-48 h-64">
                 <motion.div 
                    className="absolute inset-0 bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900 shadow-xl rounded-2xl p-4 rotate-[-6deg] z-10"
                    whileHover={{ rotate: -8, scale: 1.05 }}
                 >
                     <div className="w-full h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-4 flex items-center px-2">
                         <Users className="w-4 h-4 text-purple-400" />
                     </div>
                     <div className="space-y-3">
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full" />
                        <div className="w-2/3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full" />
                        <div className="w-3/4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full" />
                     </div>
                     <div className="absolute bottom-4 left-0 right-0 text-center">
                         <span className="text-[10px] font-bold text-purple-500 tracking-widest bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">SHARED</span>
                     </div>
                 </motion.div>

                 <motion.div 
                    className="absolute inset-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-md rounded-2xl p-4 rotate-[6deg] z-0"
                    whileHover={{ rotate: 8, x: 20 }}
                 >
                     <div className="w-full h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 flex items-center px-2">
                         <div className="w-4 h-4 bg-slate-400 rounded-full" />
                     </div>
                     <div className="space-y-3 opacity-50">
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="w-2/3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                     </div>
                     <div className="absolute bottom-4 left-0 right-0 text-center">
                         <span className="text-[10px] font-bold text-slate-400 tracking-widest">PERSONAL</span>
                     </div>
                 </motion.div>
             </div>
        </div>
    )
}