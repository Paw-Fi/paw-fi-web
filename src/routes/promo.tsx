import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Variants, motion } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { useState } from "react";
import {
  Check,
  Zap,
  Shield,
  ArrowRight,
  Rocket,
  Loader2,
} from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { FaqSection } from "@/components/ui/faq-section";
import { StructuredData } from "@/components/seo/structured-data";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/promo")({
  component: PromoPage,
  head: () => {
    const pageUrl = "https://moneko.io/promo";
    const meta = seo({
      title: "Moneko Premium Promo: $0.99 First Year (New Subscribers)",
      description:
        "Claim the Moneko Premium promotional price for your first year. Get AI insights, unlimited pockets, household mode, and recurring bill tracking.",
      keywords:
        "moneko promo, moneko premium discount, budgeting app deal, household budgeting offer, ai budgeting app promo code",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: "Moneko Premium Promo: $0.99 First Year (New Subscribers)",
          description:
            "Claim the Moneko Premium promotional price for your first year. Get AI insights, unlimited pockets, household mode, and recurring bill tracking.",
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko",
          applicationCategory: "FinanceApplication",
          offers: {
            "@type": "Offer",
            name: "Moneko Premium (Promo)",
            price: "0.99",
            priceCurrency: "USD",
            url: pageUrl,
            availability: "https://schema.org/InStock",
          },
        },
      ],
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

function PromoPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isLoading, setIsLoading] = useState(false);
  const initialMotionVariant = prefersReducedMotion ? "visible" : "hidden";

  const handleClaimOffer = () => {
    setIsLoading(true);
    // Simulate processing delay for better UX
    setTimeout(() => {
      toast.success("Offer claimed! Redirecting to setup...");
      setIsLoading(false);
      navigate({
        to: "/register",
        search: {
          redirect: "/checkout?plan=plus&billing=yearly&promo=MONEKOKICKSTART",
          code: undefined,
        },
      });
    }, 800);
  };

  const faqData = [
    {
      question: "What is included in this offer?",
      answer:
        "You get full access to Moneko Premium for one year, including unlimited pockets, AI insights, household mode, and recurring expense tracking.",
    },
    {
      question: "Will I be charged automatically after the first year?",
      answer:
        "Yes, the subscription renews at the regular annual price after the first year. You can cancel anytime from your account settings.",
    },
    {
      question: "Can I cancel if I change my mind?",
      answer:
        "Yes. You can cancel anytime from your account settings. If you need help, email hello@moneko.io and we’ll take care of you.",
    },
    {
      question: "Is this offer available for existing users?",
      answer:
        "This specific promotional offer is valid for new subscribers only.",
    },
  ];

  return (
    <AmbientHaloLayout>
      <HomeHeader />

      {/* FAQ Schema */}
      <StructuredData type="faq" data={faqData} />

      <div className="relative min-h-screen w-full overflow-hidden">
        <BackgroundBeamsWithCollision className="absolute inset-0 z-0 h-full w-full opacity-60">
          {/* Empty because we just want the effect */}
          <div />
        </BackgroundBeamsWithCollision>

        <div className="relative z-10 container mx-auto flex flex-col items-center justify-center px-4 py-12 md:py-24">
          <motion.div
            variants={containerVariants}
            initial={initialMotionVariant}
            animate="visible"
            className="mx-auto w-full max-w-4xl text-center"
          >
            {/* Hero Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-foreground mb-6 text-5xl font-bold tracking-tight drop-shadow-sm md:text-7xl"
            >
              Moneko Premium Promo <br />
              <span className="text-primary">$0.99 for Your First Year</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-muted-foreground mx-auto mb-12 max-w-2xl text-lg leading-relaxed md:text-xl"
            >
              Get AI-powered budgeting tools, recurring bill tracking, and
              household budgeting in one place. This promo is designed for new
              subscribers who want to build a plan that actually fits their real
              life.
            </motion.p>

            <motion.div variants={itemVariants} className="mx-auto mb-10 max-w-2xl">
              <p className="text-muted-foreground text-sm">
                Prefer to compare plans first? See
                {" "}
                <Link
                  to="/pricing"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  pricing
                </Link>
                {" "}
                or explore
                {" "}
                <Link
                  to="/features/pockets-system"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  Pockets
                </Link>
                ,
                {" "}
                <Link
                  to="/features/household-mode"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  Household Mode
                </Link>
                , and
                {" "}
                <Link
                  to="/features/ai-insights"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  AI Insights
                </Link>
                .
              </p>
            </motion.div>

            {/* Offer Card */}
            <motion.div
              variants={itemVariants}
              className="mx-auto mb-20 grid max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-2"
            >
              {/* Left: Value Props */}
              <div className="order-2 space-y-6 text-left md:order-1">
                <div className="space-y-4">
                  <h3 className="text-foreground flex items-center gap-2 text-2xl font-semibold">
                    <Zap className="h-6 w-6 text-amber-500" />
                    What's Included
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Unlimited Pockets & Categories",
                      "Advanced AI Insights & Chat",
                      "Household Budgeting Mode",
                      "Recurring Bill Tracking",
                      "Export to CSV/Excel",
                      "Date Night & Travel Modes",
                      "Priority Support",
                    ].map((item, idx) => (
                      <li
                        key={idx}
                        className="text-muted-foreground flex items-center gap-3"
                      >
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10">
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 text-indigo-500" />
                    <div>
                      <h4 className="text-foreground text-sm font-medium">
                        30-Day Money-Back Guarantee
                      </h4>
                      <p className="text-muted-foreground mt-1 text-xs">
                        If you're not satisfied, we'll refund your $0.99. No
                        questions asked.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Pricing Card */}
              <div className="perspective-1000 order-1 flex justify-center md:order-2">
                <MovingBorderButton
                  borderRadius="1.5rem"
                  containerClassName="h-auto w-full md:w-[380px]"
                  className="bg-card text-card-foreground overflow-visible border-none p-0"
                  duration={3500}
                >
                  <div className="relative z-20 flex h-full w-full flex-col p-8">
                    <div className="absolute top-0 right-0 p-4">
                      <Badge className="border-0 bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600">
                        98% OFF
                      </Badge>
                    </div>

                    <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                      Annual Access
                    </div>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="text-foreground text-5xl font-bold">
                        $0.99
                      </span>
                      <span className="text-muted-foreground decoration-destructive/50 text-xl line-through decoration-2">
                        $59.99
                      </span>
                    </div>
                    <div className="text-muted-foreground mb-8 text-sm">
                      per year, billed annually
                    </div>

                    <div className="via-border mb-8 h-px w-full bg-gradient-to-r from-transparent to-transparent" />

                    <ShimmerButton
                      className="w-full shadow-xl"
                      shimmerColor="#fbbf24" // Amber/Gold shimmer
                      background="radial-gradient(ellipse at center, #4f46e5 0%, #3730a3 100%)" // Indigo gradient
                      onClick={handleClaimOffer}
                      disabled={isLoading}
                    >
                      <span className="flex items-center gap-2 font-semibold tracking-wide text-white">
                        CLAIM OFFER NOW <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </ShimmerButton>

                    <p className="text-muted-foreground mt-4 text-center text-xs">
                      Auto-renews at regular price after 1 year. Cancel anytime.
                    </p>

                    <p className="text-muted-foreground mt-2 text-center text-[11px] leading-relaxed">
                      By claiming this offer, you agree to our
                      {" "}
                      <Link
                        to="/terms-of-service"
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        Terms
                      </Link>
                      {" "}
                      and
                      {" "}
                      <Link
                        to="/privacy-policy"
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </MovingBorderButton>
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={itemVariants}
              className="border-border w-full border-t py-10"
            >
              <UserCommunityShowcase />
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={initialMotionVariant}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={containerVariants}
              className="mx-auto mt-10 w-full max-w-3xl"
            >
              <FaqSection
                faqData={faqData}
                title="Frequently Asked Questions"
              />
            </motion.div>

            {/* Not Sure Contact Card */}
            <motion.div
              className="mx-auto mt-20 w-full max-w-3xl md:mt-24"
              initial={initialMotionVariant}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={itemVariants}
            >
              <Card className="bg-subtle-background text-center">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground text-xl">
                    Not Sure Which Plan is Right for You?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground mx-auto mb-6 max-w-lg text-base">
                    Start with our Free plan to explore core features, or dive
                    deeper with Plus. You can always upgrade as your budgeting
                    needs grow.
                  </CardDescription>
                  <Button
                    variant="link"
                    className="text-primary hover:text-primary/80"
                    asChild
                  >
                    <a
                      href="mailto:hello@moneko.io"
                      className="inline-flex items-center gap-2"
                    >
                      Contact Us for a Recommendation
                      <Rocket className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="p-8 shadow-xl">
            <CardContent className="flex flex-col items-center gap-4 p-0">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Processing...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </AmbientHaloLayout>
  );
}
