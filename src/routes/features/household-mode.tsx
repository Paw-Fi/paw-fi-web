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
import { BentoCard } from "@/components/ui/bento-card";

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
      image: "https://moneko.io/og-img.png",
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
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
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

      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 px-4 md:px-6 max-w-[1200px] mx-auto">
        
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto mb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm font-medium mb-6">
                 <Users className="w-3 h-3 fill-current" />
                 Collaborative Finance for Couples
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Manage <span className="text-slate-500 dark:text-slate-400">Ours</span> <br />
                without losing <span className="relative text-gray-400 dark:text-gray-600">Yours.</span>
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

        {/* Bento Grid Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[auto] md:auto-rows-[550px] mb-32">
            
            {/* Card 1: The Orbit (Wide) */}
            <BentoCard className="md:col-span-2 overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative order-2 md:order-1">
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Unified Household Hub.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                       Track joint expenses like mortgage, utilities, and groceries in a single view. See who paid what instantly.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[400px] md:min-h-auto flex items-center justify-center p-8 order-1 md:order-2 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                    <HouseholdOrbitVisual />
                </div>
            </BentoCard>

            {/* Card 2: Fair Splitting (Tall) */}
            <BentoCard className="relative overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                 <div className="px-8 w-full z-10 shrink-0">
                     <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <Split className="w-5 h-5" />
                     </div>
                     <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Split Fairly</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-base">
                        50/50? Percentage of income? Custom shares? You choose how to split every bill.
                     </p>
                 </div>
                 <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-8">
                    <FairSplittingVisual />
                 </div>
            </BentoCard>

            {/* Card 3: Instant Settlement (Tall) */}
             <BentoCard className="xs:col-span-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col p-8 justify-between relative overflow-hidden">
                <div className="z-10">
                   <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <HeartHandshake className="w-5 h-5" />
                   </div>
                   <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">One-Tap Settle Up</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
                       Moneko tallies the debt. Settle a whole month of expenses with one transfer.
                   </p>
                </div>
                <div className="flex justify-center items-end flex-1">
                     <InstantSettlementVisual />
                </div>
             </BentoCard>

             {/* Card 4: Privacy (Wide) */}
             <BentoCard className="md:col-span-2 overflow-hidden bg-slate-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row-reverse">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative">
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Total Autonomy.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                       Your personal spending is yours. Only transactions you explicitly 'share' enter the household view.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-t from-transparent to-white/50 dark:to-black/50">
                    <PrivateByDefaultVisual />
                </div>
            </BentoCard>

        </section>

        {/* Methodology Section */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">The Science of Shared Finances</h2>
                 <p className="text-slate-600 dark:text-slate-400">Why thousands of couples trust Moneko to manage their household economy.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">Reduces Money Conflict</h3>
                       <p className="text-sm text-slate-500">Automated tracking removes the 'nag factor' from relationship finances.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">Joint Goal Alignment</h3>
                       <p className="text-sm text-slate-500">Collaborate on large purchases like homes or vacations with shared 'Pockets'.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready to team up?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">Join over 50,000 users building better financial futures together.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> End-to-End Encryption</span>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Bank-Level Security</span>
            </div>
         </section>
      </main>
    </div>
  );
}

// --- Visual Components ---

const FeatureTag = ({ label }: { label: string }) => (
  <div className="relative flex h-full !w-64 items-center justify-center">
    <span
      aria-hidden="true"
      className="block h-2 w-2 rounded-full bg-slate-900 dark:bg-white shadow-sm"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="absolute left-full ml-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 whitespace-nowrap"
    >
      {label}
    </Badge>
  </div>
);

const HouseholdOrbitVisual = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionSpeed = prefersReducedMotion ? 0 : 1; 

  return (
    <div className="relative h-full w-full overflow-hidden min-h-[300px] flex items-center justify-center">
      <div className="relative flex items-center justify-center scale-110">
           <div className="relative z-10 p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
                <img src={ThreeMonekos} className="h-20 w-auto grayscale" alt="Household Hub" />
           </div>

        <OrbitingCircles iconSize={40} radius={80} duration={30} path speed={motionSpeed}>
            <Avatar className="border-2 border-white shadow-sm w-12 h-12 grayscale">
                <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
                <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-white shadow-sm w-12 h-12 grayscale">
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
                        className="h-full bg-slate-900 dark:bg-slate-200 relative"
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
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1 rounded-md font-medium">You: $75.00</span>
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
                <div className="bg-slate-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
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
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
             <div className="relative w-48 h-64">
                 <motion.div 
                    className="absolute inset-0 bg-slate-900 dark:bg-black border-2 border-slate-700 dark:border-slate-800 shadow-xl rounded-2xl p-4 rotate-[-6deg] z-10 text-white"
                    whileHover={{ rotate: -8, scale: 1.05 }}
                 >
                     <div className="w-full h-8 bg-white/10 rounded-lg mb-4 flex items-center px-2">
                         <Users className="w-4 h-4 text-white" />
                     </div>
                     <div className="space-y-3">
                        <div className="w-full h-2 bg-white/20 rounded-full" />
                        <div className="w-2/3 h-2 bg-white/20 rounded-full" />
                        <div className="w-3/4 h-2 bg-white/20 rounded-full" />
                     </div>
                     <div className="absolute bottom-4 left-0 right-0 text-center">
                         <span className="text-[10px] font-bold text-white tracking-widest bg-white/10 px-2 py-1 rounded border border-white/20">SHARED</span>
                     </div>
                 </motion.div>

                 <motion.div 
                    className="absolute inset-0 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md rounded-2xl p-4 rotate-[6deg] z-0"
                    whileHover={{ rotate: 8, x: 20 }}
                 >
                     <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4 flex items-center px-2">
                         <div className="w-4 h-4 bg-slate-400 rounded-full" />
                     </div>
                     <div className="space-y-3 opacity-50">
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        <div className="w-2/3 h-2 bg-slate-200 dark:bg-slate-800 rounded-full" />
                     </div>
                     <div className="absolute bottom-4 left-0 right-0 text-center">
                         <span className="text-[10px] font-bold text-slate-400 tracking-widest">PERSONAL</span>
                     </div>
                 </motion.div>
             </div>
        </div>
    )
}