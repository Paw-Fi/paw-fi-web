import { createFileRoute } from "@tanstack/react-router";
import { Variants, motion, AnimatePresence } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { useState, useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toast } from "react-toastify";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket, Loader2, Zap, Target, Users, Sparkles, ShieldCheck } from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import classNames from "classnames";
import { FaqSection } from "@/components/ui/faq-section";
import { FeatureComparisonGrid } from "@/components/pricing/feature-comparison-grid";
import { StructuredData } from "@/components/seo/structured-data";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { getPricingTiers } from "@/data/pricing-plans";

// Added new pro-max components
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title: "Moneko Pricing | AI Budgeting App Plans for Individuals & Households",
      description:
        "Moneko Pro is your WhatsApp-first money assistant. Start a 30-day free trial, then keep everything unlocked for $9.99/year (best value) or $2.99/month. Track, budget, and get AI insights without leaving chat.",
      keywords:
        "moneko pricing, moneko plans, AI budgeting app pricing, budgeting app subscription, envelope budgeting app, household budgeting app, WhatsApp expense tracker, personal finance app subscription",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko - AI Budgeting App",
      description:
        "Moneko is an AI-assisted budgeting app that helps you capture spending, organize pockets (envelopes), manage recurring items, and plan scenarios across personal and household finances.",
      image: "https://moneko.io/og-img.png",
      brand: {
        "@type": "Brand",
        name: "Moneko",
      },
      category: "FinanceApplication",
      audience: {
        "@type": "Audience",
        "audienceType": "Individual Financial Learners"
      },
      offers: {
        "@type": "OfferCatalog",
        name: "Moneko - AI Personal Finance Coach & Budgeting App",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Moneko Pro Monthly",
            price: "2.99",
            priceCurrency: "USD",
            description: "Monthly subscription to Moneko Pro with WhatsApp-first money assistance.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Pro Annual",
            price: "9.99",
            priceCurrency: "USD",
            description: "Annual subscription to Moneko Pro — best value plan with WhatsApp assistant features.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
        ],
      },
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

function PlanRow({ 
  title, 
  price, 
  originalPrice, 
  subtitle, 
  badge, 
  selected, 
  onClick 
}: { 
  title: string, 
  price: string, 
  originalPrice?: string, 
  subtitle: string, 
  badge?: string, 
  selected: boolean, 
  onClick: () => void 
}) {
  return (
    <div 
      onClick={onClick}
      className={classNames(
        "relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent border-b-border/30 hover:bg-muted/50 bg-background/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={classNames(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          selected ? "border-primary" : "border-muted-foreground/30"
        )}>
          {selected && <motion.div layoutId="radio-dot" className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className={classNames("font-semibold", selected ? "text-foreground" : "text-foreground/80")}>{title}</span>
            {badge && (
              <Badge variant={selected ? "default" : "secondary"} className={classNames("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5", selected ? "" : "opacity-70")}>
                {badge}
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </div>
      </div>

      <div className="text-left sm:text-right ml-8 sm:ml-0 flex items-center sm:block gap-2">
        {originalPrice && (
          <span className="text-xs text-muted-foreground/60 line-through sm:block">
            {originalPrice}
          </span>
        )}
        <span className={classNames("font-bold text-lg", selected ? "text-foreground" : "text-foreground/80")}>
          {price}
        </span>
      </div>
    </div>
  )
}

function PricingPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  type PlanType = "monthly" | "yearly" | "lifetime";
  const [selectedPlanId, setSelectedPlanId] = useState<PlanType>("yearly");

  useEffect(() => {
    setIsLoading(false);
  }, []); 

  const pricingTiers = getPricingTiers();
  
  const monthlyTier = pricingTiers.find(t => t.title === "Plus" || (t.title.includes("Plus") && !t.title.includes("Yearly")));
  const yearlyTier = pricingTiers.find(t => t.title.includes("Yearly"));
  const lifetimeTier = pricingTiers.find(t => t.title.includes("Lifetime"));

  const safelyGetTier = (tier: any, fallbackParams: any) => tier || fallbackParams;
  
  const mTier = safelyGetTier(monthlyTier, { title: "Monthly", priceMonthly: "$2.99", compareAtPriceMonthly: "$7.99" });
  const yTier = safelyGetTier(yearlyTier, { title: "Yearly", priceMonthly: "$9.99", compareAtPriceMonthly: "$59.99" });
  const lTier = safelyGetTier(lifetimeTier, { title: "Lifetime", priceMonthly: "$19.99" });

  const faqData = [
    {
      question: "Can I upgrade or downgrade my plan later?",
      answer: "Yes. You can change plans from your account settings. Plan changes and billing dates are handled by Stripe based on your current subscription.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards. Payments are processed through Stripe.",
    },
    {
      question: "Is my financial data secure?",
      answer: "We use encrypted connections and follow least-privilege access patterns. For details on how we handle information, see our Privacy Policy or contact hello@moneko.io.",
    },
    {
      question: "What is your cancellation and refund policy?",
      answer: "You can cancel anytime from account settings. For billing questions (including refunds), contact hello@moneko.io and we'll help based on your payment details.",
    },
    {
      question: "What does the AI help with in Moneko?",
      answer: "Moneko supports faster capture (text, receipt photos, voice notes where available), smarter categorization workflows, and scenario-style insights ('what if' planning) to help you understand spending patterns and make informed budgeting decisions.",
    },
    {
      question: "Do you offer discounts?",
      answer: "Discounts may be offered during limited-time promotions. Join our Discord or contact hello@moneko.io for current options.",
    }
  ];

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        setIsLoading(false);
        toast.error("Please sign in to subscribe");
        navigate({ to: "/login", search: { redirect: "/pricing" } });
        return;
      }

      setIsLoading(false);

      if (selectedPlanId === "lifetime") {
        navigate({
          to: "/checkout",
          search: { plan: "lifetime" },
        });
      } else {
        navigate({
          to: "/checkout",
          search: { plan: "plus", billing: selectedPlanId },
        });
      }
    } catch (err) {
      console.error("Error handling subscription:", err);
      setIsLoading(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
      },
    },
  };

  // Bento Grid features
  const bentoFeatures = [
    {
      name: "Proactive AI Coaching",
      description: "Dual-persona AI runs scenario planning based on your life.",
      href: "/features/ai-insights",
      cta: "Meet your AI",
      className: "lg:row-span-2",
      Icon: Sparkles,
      component: (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 overflow-hidden">
          <BorderBeam duration={8} size={200} />
          <div className="absolute inset-0 z-0">
             <DotPattern />
          </div>
          <div className="relative z-10 p-5 bg-card/90 backdrop-blur shadow-2xl rounded-2xl border border-border/50 max-w-[90%] md:max-w-[70%] lg:max-w-[80%] w-full mx-auto">
             <div className="flex gap-3 items-end mb-4 justify-end">
                <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm text-sm">
                   Can I afford a new car next month?
                </div>
             </div>
             <div className="flex gap-3">
                <div className="bg-muted text-foreground p-3 rounded-2xl rounded-tl-sm text-sm">
                   Based on your pockets, you can afford a $400/mo payment if we reallocate the 'Dining Out' pocket.
                </div>
             </div>
          </div>
        </div>
      ),
    },
    {
      name: "Household Sync",
      description: "Manage pockets together.",
      href: "/features/household-mode",
      cta: "Sync up",
      className: "lg:col-span-1",
      Icon: Users,
      component: (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-background">
           <OrbitingCircles duration={15} radius={50} speed={1}>
             <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4" alt="user 1" className="w-10 h-10 rounded-full shadow-md" />
           </OrbitingCircles>
           <OrbitingCircles duration={15} radius={50} speed={1} reverse>
             <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Aneka&backgroundColor=c0aede" alt="user 2" className="w-10 h-10 rounded-full shadow-md" />
           </OrbitingCircles>
           <div className="z-10 bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 border-primary space-x-1 outline outline-1 outline-border">
             <Users className="w-8 h-8 text-primary" />
           </div>
        </div>
      )
    },
    {
      name: "Instant Capture",
      description: "Forward receipts or use WhatsApp.",
      href: "/features/whatsapp-assistant",
      cta: "Try capture",
      className: "lg:col-span-1",
      Icon: Zap,
      component: (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-emerald-500/10 to-transparent">
           <div className="relative group/mock">
             <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl blur opacity-25 group-hover/mock:opacity-75 transition duration-500"></div>
             <div className="relative bg-card p-4 rounded-xl border flex gap-3 items-center">
                 <div className="bg-[#25D366] p-2 rounded-full">
                    <Check className="text-white w-4 h-4"/>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold">Coffee 4.50</span>
                    <span className="text-xs text-muted-foreground">Logged to "Dining" pocket</span>
                 </div>
             </div>
           </div>
        </div>
      )
    }
  ];

  return (
    <AmbientHaloLayout>
      <StructuredData
        type="faq"
        data={faqData}
      />

      <HomeHeader />
      
      <div className="min-h-screen pb-20">
        
        {/* Unified Pricing Hero Section */}
        <section className="relative px-4 pt-16 pb-12 md:pt-28 md:pb-20 mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col lg:flex-row gap-12 xl:gap-20 items-center lg:items-start justify-between"
          >
            {/* Left Column: Value Prop */}
            <div className="flex-1 w-full max-w-2xl text-center lg:text-left pt-0 lg:pt-8 flex flex-col items-center lg:items-start">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">30-day money-back guarantee</span>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6"
              >
                One simple app.<br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                  Master your money.
                </span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl"
              >
                Join thousands who stopped manually tracking every penny on spreadsheets. Moneko automates the heavy lifting with AI, giving you the pure intentionality of zero-based budgeting.
              </motion.p>
              
              {/* Note: The old core features map was removed here as we are replacing it with the Bento Grid below */}
              
            </div>

            {/* Right Column: Interactive Pricing Checkout Box */}
            <motion.div 
              variants={itemVariants}
              className="w-full max-w-md lg:w-[440px] shrink-0"
            >
              <div className="relative rounded-[2rem] border border-border/50 bg-card/60 backdrop-blur-3xl shadow-2xl overflow-hidden p-[2px]">
                {/* Subtle animated gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 opacity-20" />
                
                <div className="relative bg-card rounded-[calc(2rem-2px)] p-6 sm:p-8 flex flex-col shadow-inner">
                  
                  <div className="mb-6 text-center lg:text-left">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                      Unlock Moneko Pro
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start building wealth effortlessly.
                    </p>
                  </div>

                  {/* Plan Selection */}
                  <div className="flex flex-col gap-2 mb-8">
                    <PlanRow 
                      title="Yearly"
                      subtitle="Billed annually"
                      price={yTier.priceMonthly}
                      originalPrice={yTier.compareAtPriceMonthly}
                      badge="Best Value"
                      selected={selectedPlanId === "yearly"}
                      onClick={() => setSelectedPlanId("yearly")}
                    />
                    <PlanRow 
                      title="Monthly"
                      subtitle="Billed monthly"
                      price={mTier.priceMonthly}
                      originalPrice={mTier.compareAtPriceMonthly}
                      selected={selectedPlanId === "monthly"}
                      onClick={() => setSelectedPlanId("monthly")}
                    />
                    <PlanRow 
                      title="Lifetime"
                      subtitle="Yours forever"
                      price={lTier.priceMonthly}
                      badge="Limited"
                      selected={selectedPlanId === "lifetime"}
                      onClick={() => setSelectedPlanId("lifetime")}
                    />
                  </div>

                  {/* Feature Checklist inside the card */}
                  <div className="border-t border-border/50 pt-6 mb-8 space-y-3">
                    {yearlyTier?.features.slice(0, 4).map((feature: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground/80">{feature.text || feature}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium pt-1">
                      <span>+ And much more</span>
                    </div>
                  </div>

                  {/* Checkout CTA */}
                  <Button 
                    size="lg" 
                    className="w-full py-6 text-base font-medium shadow-md group relative overflow-hidden"
                    onClick={handleSubscribe}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                       {selectedPlanId === "lifetime" ? "Secure Lifetime Access" : "Upgrade to Pro"}
                       <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </Button>
                  
                  {/* Dynamic Subtext */}
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={selectedPlanId}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="text-center text-xs text-muted-foreground mt-4"
                    >
                      {selectedPlanId === "yearly" && "Save up to 70% compared to monthly. Modify your plan anytime."}
                      {selectedPlanId === "monthly" && "No commitment. Cancel or upgrade to yearly anytime."}
                      {selectedPlanId === "lifetime" && "One-time payment. Enjoy future updates for free."}
                    </motion.p>
                  </AnimatePresence>

                  {selectedPlanId === "lifetime" && (
                    <div 
                      className="mt-4 mx-auto cursor-pointer group w-full"
                      onClick={() => window.open(DISCORD_URL, '_blank')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 hover:bg-[#5865F2]/20 transition-all duration-200">
                        <DiscordLogoIcon className="h-4 w-4 text-[#5865F2] flex-shrink-0" />
                        <span className="text-xs font-semibold text-[#5865F2] dark:text-[#8ea1e1]">
                           Join Discord for a discount code
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

                {/* Community Showcase (Social Proof) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <UserCommunityShowcase />
        </motion.div>

        {/* Bento Grid Showcase Section */}
        <motion.div
           initial="hidden"
           whileInView="visible"
           viewport={{ once: true, margin: "-100px" }}
           variants={containerVariants}
           className="px-4 max-w-7xl mx-auto mb-16 md:mb-24 mt-8"
        >
          <div className="text-center lg:text-left mb-10 w-full">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Premium Features</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto lg:mx-0">Experience the future of budgeting with cutting-edge tools.</p>
          </div>
          <div className="bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden min-h-[800px] lg:min-h-[500px]">
            <BentoGrid className="lg:grid-rows-2 h-full">
             {bentoFeatures.map((feature) => (
               <BentoCard key={feature.name} {...feature} />
             ))}
           </BentoGrid>
          </div>
        </motion.div>



        {/* Deep Dive Feature Comparison */}
        {/* <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mt-20 md:mt-32 max-w-7xl mx-auto px-4"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you get with Pro</h2>
            <p className="text-muted-foreground text-lg">A side-by-side look at what Moneko can do for you.</p>
          </div>
          <FeatureComparisonGrid prefersReducedMotion={prefersReducedMotion} />
        </motion.div> */}

        {/* FAQs */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mt-20 md:mt-32"
        >
          <FaqSection faqData={faqData} title="Pricing & Billing FAQ" />
        </motion.div>

        {/* Final CTA Strip */}
        <motion.div 
          className="mt-24 md:mt-32 px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={itemVariants}
        >
          <Card className="text-center bg-transparent border-0 shadow-none max-w-2xl mx-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-foreground">
                Still have questions?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg mb-8 text-muted-foreground">
                We're here to help you make the best decision for your financial future.
              </CardDescription>
              <Button size="lg" variant="outline" className="rounded-full bg-background border-2 hover:bg-muted font-medium px-8" asChild>
                <a href="mailto:hello@moneko.io" className="inline-flex items-center gap-2">
                  Contact Support Team
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="p-8 shadow-2xl border-none">
            <CardContent className="flex flex-col items-center gap-6 p-0">
              <div className="relative">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground animate-pulse">Processing your request...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </AmbientHaloLayout>
  );
}

export default PricingPage;
