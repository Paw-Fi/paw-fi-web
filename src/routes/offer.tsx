/**
 * Special Offer Landing Page
 *
 * Route: /offer
 * Purpose: Provide a high-conversion landing page for promo codes.
 *
 * Flow:
 * 1. User arrives with ?plan=X&promo=Y
 * 2. Show big announcement: "You just received 15% off for lifetime"
 * 3. CTA button "Register to claim the offer" redirects to /register
 * 4. After registration, user is redirected to /checkout with params preserved
 */

import { createFileRoute, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { HelpCircle, Sparkles, Gift, ArrowRight, CheckCircle, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { DISCORD_URL } from "@/lib/external-links";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { HomeHeader } from "@/components/index/header";

// Define search params type
type OfferSearchParams = {
  plan?: string;
  promo?: string;
};

export const Route = createFileRoute("/offer")({
  component: OfferPage,
  validateSearch: (search: Record<string, unknown>): OfferSearchParams => ({
    plan: (search.plan as string) || "lifetime",
    promo: (search.promo as string) || undefined,
  }),
  beforeLoad: ({ search }) => {
    if (!search.promo) {
      throw redirect({
        to: "/",
      });
    }
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/offer");
    return {
      meta: seo({
        title: "Claim Your Special Offer | 15% Off Lifetime | Moneko",
        description:
          "You just received an exclusive 15% discount for Moneko Lifetime. Join now and unlock all premium features forever.",
        url: pageUrl,
      }),
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

// FAQ data for the 15% off offer
const offerFaq = [
  {
    question: "How do I claim the 15% discount?",
    answer:
      "Simply click the 'Claim your offer' button to register or sign in. The discount code is pre-applied to your account and will be automatically visible when you reach the checkout page.",
  },
  {
    question: "Is this a one-time payment?",
    answer:
      "Yes! The lifetime plan is a one-time purchase. You pay once and get access to all current and future premium features of Moneko forever—no recurring subscriptions.",
  },
  {
    question: "What features are included in Moneko Plus?",
    answer:
      "Moneko Plus gives you instant expense capture from receipts, WhatsApp, and chat.",
  },
  {
    question: "Is my payment secure?",
    answer:
      "Absolutely. We use Stripe for all payment processing, ensuring your card details are handled with industry-standard encryption and security (PCI DSS compliance).",
  },
  {
    question: "Can I use this offer if I already have an account?",
    answer:
      "Yes! If you are an existing free member, simply sign in and click 'Claim your offer' to be redirected to the discounted checkout.",
  },
];

function OfferPage() {
  const { plan, promo } = useSearch({ from: "/offer" });
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleClaimOffer = () => {
    // Construct the redirect path for checkout
    const checkoutSearch = new URLSearchParams();
    if (plan) checkoutSearch.set("plan", plan);
    if (promo) checkoutSearch.set("promo", promo);

    const checkoutPath = `/checkout?${checkoutSearch.toString()}`;

    if (user) {
      // If already logged in, go straight to checkout
      navigate({
        to: "/checkout",
        search: { plan, promo },
      });
    } else {
      // If not logged in, go to register with redirect back to checkout
      navigate({
        to: "/register",
        search: { redirect: checkoutPath },
      });
    }
  };

  return (
    <div className="bg-moneko-background relative min-h-screen overflow-hidden px-4 pt-2">
      {/* Header */}
      <HomeHeader />

      {/* Background Beams with Collision (fixed to viewport) */}
      <BackgroundBeamsWithCollision className="pointer-events-none fixed inset-0 z-0 h-screen" />

      {/* Dotted grid pattern overlay */}
      <DotPattern
        className="pointer-events-none fixed inset-0 z-[1] [mask-image:radial-gradient(1200px_circle_at_center,white,transparent)] opacity-30 dark:opacity-15"
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto flex flex-col items-center px-0 pb-20 sm:px-8 lg:px-8"
        style={{
          transform: "translate3d(0,0,0)",
          WebkitTransform: "translate3d(0,0,0)",
        }}
      >
        <section className="flex max-w-5xl flex-col items-center pt-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-12 text-center"
          >
          
            <h1 className="text-foreground mb-4 text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Exclusive 15% Off Moneko Expense Tracker Lifetime
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
              Congratulations! You've unlocked an exclusive discount for Moneko Expense Tracker. Start building your financial future today with
              AI-powered guidance and our most powerful wealth-building tools.
            </p>

            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={handleClaimOffer}
                className="group relative h-16 rounded-full px-10 text-lg font-medium transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {user ? "Claim your offer" : "Register to claim the offer"}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button asChild variant="link" className="text-primary">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  How it works
                </a>
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Carousel Section */}
        <MobileAppPreviewCarousel
          className="z-10 px-4 sm:px-8 lg:px-8"
          contentClassName="max-w-none"
          carouselClassName="h-[560px] w-screen md:h-[640px] lg:h-[640px] xl:h-[680px] 2xl:h-[720px]"
          title="Your AI Finance Companion"
          description="Take Moneko with you. Track expenses, get AI coaching, and manage your wealth from anywhere."
        />

        {/* How It Works Section */}
        <section id="how-it-works" className="mt-16 mb-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-foreground mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
                How to claim your offer
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl">
                Follow these simple steps to unlock your lifetime discount and
                start your premium journey.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              {[1, 2, 3].map((num) => (
                <Card key={num} className="border-subtle-border rounded-3xl">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="bg-subtle-background text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <span className="text-sm font-medium">{num}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-muted-foreground text-xs font-medium">
                          Step {num}
                        </span>
                        <h3 className="text-foreground mt-1 mb-1 text-lg font-medium">
                          {num === 1 && "Register or Sign In"}
                          {num === 2 && "Pre-applied Discount"}
                          {num === 3 && "Secure Checkout"}
                        </h3>
                        <p className="text-muted-foreground">
                          {num === 1 &&
                            "Create your free Moneko account. If you already have one, just sign in to continue."}
                          {num === 2 &&
                            "    You’ll be redirected to our secure checkout page, where your promo code will be applied automatically."}
                          {num === 3 &&
                            "Complete your purchase and start enjoying Moneko Premium right away."}
                        
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Notes */}
            <Card className="border-subtle-border mt-8 rounded-3xl">
              <CardContent className="p-6">
                <h4 className="text-foreground mb-3 font-medium">
                  Good to know
                </h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>     Your Lifetime plan can be shared with family members at no additional cost
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> The discount
                    is applied to the one-time purchase price.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> No monthly
                    fees, no hidden costs. Pay once, use forever.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>This offer
                    is valid for the Lifetime plan only.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="relative z-10 w-full pb-20">
          <div className="mx-auto max-w-5xl px-0 sm:px-8 lg:px-8">
            <h2 className="text-foreground mb-12 text-center text-4xl font-bold tracking-tight sm:mb-16 sm:text-5xl">
              Common Questions
            </h2>
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue="item-0"
            >
              {offerFaq.map((faq, index) => (
                <AccordionItem key={`faq-${index}`} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-balance">
                    <p>{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>

      {/* Footer for non-authenticated users */}
      {!user && !authLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative z-10 pb-16 text-center"
        >
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 text-sm underline"
              onClick={() =>
                navigate({
                  to: "/login",
                  search: { redirect: `/checkout?plan=${plan}&promo=${promo}` },
                })
              }
            >
              Sign in here
            </Button>
          </p>
        </motion.div>
      )}
    </div>
  );
}
