/**
 * Referral Page
 *
 * Landing page for referral system with three steps:
 * 1. Register (for new users)
 * 2. Your referral code (for existing users)
 * 3. Download the App Store (after someone accepts)
 *
 * Design matches couple-budgeting.tsx style with BackgroundBeamsWithCollision + DotPattern
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HelpCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useReferralCode } from "@/hooks/use-referral-code";
import { useState } from "react";
import { ReferrerCodeCard } from "@/components/referral/referrer-code-card";
import { ReferralAcceptanceList } from "@/components/referral/referral-acceptance-list";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { ReferralAuthPrompt } from "@/components/auth/referral-auth-prompt";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSubscription } from "@/hooks/use-subscription";
import phone1 from "@assets/images/couple-budgeting/1.png";
import phone2 from "@assets/images/couple-budgeting/2.png";
import phone3 from "@assets/images/couple-budgeting/3.png";
import phone4 from "@assets/images/couple-budgeting/4.png";
import phone5 from "@assets/images/couple-budgeting/5.png";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DISCORD_URL } from "..";
import { HomeHeader } from "@/components/index/header";

// Route search params type
type ReferralSearch = {
  status?: "success" | "canceled";
  session_id?: string;
  flow?: "trial" | "referral" | string;
};

export const Route = createFileRoute("/referral/")({
  component: ReferralPage,
  validateSearch: (search: Record<string, unknown>): ReferralSearch => ({
    status: search.status as "success" | "canceled" | undefined,
    session_id: search.session_id as string | undefined,
    flow: search.flow as string | undefined,
  }),
  head: () => {
    const pageUrl = getCanonicalUrl("/referral");
    const title = "Invite Friends to Moneko | 50% Off Lifetime";
    const description =
      "Invite a friend to Moneko and give them 50% off the lifetime plan. The referral code is auto-applied at checkout so they can pay with card and unlock lifetime access.";

    const meta = seo({
      title,
      description,
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

// FAQ data for referral system
const referralFaq = [
  {
    question: "How does the Moneko referral program work?",
    answer:
      "Share your unique referral link with a friend. When they sign up with your link, they can buy the lifetime plan at 50% off, with the discount applied automatically at checkout.",
  },
  {
    question: "Who can use the referral offer?",
    answer:
      "New users who join Moneko through your referral link are eligible for the 50% off lifetime offer. Existing premium or lifetime members are not eligible for the referral discount.",
  },
  {
    question: "Does my friend need to pay or add a card?",
    answer:
      "Yes. The referral offer is now a paid lifetime plan at 50% off, so checkout requires card details to complete the purchase.",
  },
  {
    question: "How do I find and share my referral link?",
    answer:
      "Sign in and visit this page to copy your referral link. Share it via text, WhatsApp, email, or social—whatever your friend prefers.",
  },
  {
    question: "When is the discount applied?",
    answer:
      "The 50% discount is applied automatically when your friend opens checkout from your referral flow. Lifetime access starts right after successful payment.",
  },
  {
    question: "Is there a limit to how many friends I can invite?",
    answer:
      "There is no limit. Share your link with as many friends as you like so more people can claim the 50% off lifetime offer.",
  },
  {
    question: "What if my friend forgot to use my link?",
    answer:
      "Ask them to sign up again using your referral link. If they already created an account, contact support and we’ll help if eligible.",
  },
  {
    question: "Can I track who joined with my link?",
    answer:
      "Yes. This page shows who accepted your invite and who completed checkout, so you can track referral activity in one place.",
  },
];

// Mobile preview cards data (reuse couple-budgeting mockups)
const mobilePreview = [
  {
    src: phone1,
    title: "Link accounts and manage money together",
    description:
      "Log groceries, bills, and date nights. See who paid—instantly.",
  },
  {
    src: phone2,
    title: "Add expenses and split fairly",
    description: "Watch shared savings grow toward your next trip or big goal.",
  },
  {
    src: phone3,
    title: "Stay aligned with real‑time alerts",
    description: "Create shared budgets and keep personal spending separate.",
  },
  {
    src: phone4,
    title: "Set goals and celebrate progress",
    description: "Smart insights spot trends and help couples save more.",
  },
  {
    src: phone5,
    title: "Scan receipts in WhatsApp",
    description: "Auto‑log spending from chats for fast, accurate tracking.",
  },
];

function ReferralPage() {
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();

  // State for trial starter
  const [startingTrial, setStartingTrial] = useState(false);

  // Fetch referral code for authenticated users
  const {
    code: referralCode,
    acceptanceCount,
    completedCount,
    acceptedBy,
    isLoading: referralLoading,
    error: referralError,
    trialEnd,
    isTrialing,
  } = useReferralCode({ enabled: !!user });

  // Use subscription as source-of-truth for trial state/eligibility
  const { subscription, isLoading: subscriptionLoading } = useSubscription(
    user?.id,
  );
  const subIsTrialing = Boolean(
    subscription && subscription.status === "trialing",
  );
  const subTrialEnd = subIsTrialing
    ? (subscription?.current_period_end ?? null)
    : null;
  const subTrialEligible = !subscription || subscription.plan === "free";

  const openAppStore = () => {
    window.open("https://apps.apple.com/app/moneko/id6753925279", "_blank");
  };

  // Determine which view to show
  // Referrer: logged in user who can share their code
  const isReferrer = !!user;
  // Visitor: not logged in, needs to see auth prompt
  const isVisitor = !user && !userLoading;

  // Note: No full-page loading. We will render skeletons for sections below.

  return (
    <div className="bg-moneko-background relative min-h-screen overflow-hidden px-4 pt-2">
      {/* Header - same as couple-budgeting */}
      <HomeHeader />

      {/* Background Beams with Collision - match couple-budgeting (fixed to viewport) */}
      <BackgroundBeamsWithCollision className="pointer-events-none fixed inset-0 z-0 h-screen" />

      {/* Dotted grid pattern overlay - same style as couple-budgeting */}
      <DotPattern
        className="pointer-events-none fixed inset-0 z-[1] [mask-image:radial-gradient(1200px_circle_at_center,white,transparent)] opacity-30 dark:opacity-15"
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto flex flex-col items-center px-0 py-20 sm:px-8 lg:px-8"
        style={{
          transform: "translate3d(0,0,0)",
          WebkitTransform: "translate3d(0,0,0)",
        }}
      >
        <section className="flex max-w-5xl flex-col items-center">
          {/* Header */}
          <motion.div className="mb-12 text-center">
            <h1 className="text-foreground mb-4 text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Share Moneko,
              <br /> Give 50% Off Lifetime
            </h1>
            <p className="text-muted-foreground mx-auto mb-6 max-w-2xl text-lg leading-relaxed">
              Share your referral link so friends can claim 50% off the lifetime
              plan. The discount is applied automatically at checkout, and
              they'll add card details to complete the purchase.
            </p>
            <Button asChild variant="link" className="text-primary">
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                How it works
              </a>
            </Button>
          </motion.div>

          {/* Loading skeleton - show immediately while checking auth */}
          {userLoading && (
            <div className="w-full space-y-6">
              <div className="bg-card border-subtle-border animate-pulse rounded-3xl border p-8 shadow-sm">
                <div className="bg-subtle-background mb-6 h-6 w-1/3 rounded" />
                <div className="bg-subtle-background mb-6 h-16 w-full rounded" />
                <div className="bg-subtle-background mb-4 h-10 w-full rounded" />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-subtle-background h-10 rounded" />
                  <div className="bg-subtle-background h-10 rounded" />
                </div>
              </div>
            </div>
          )}

          {/* Visitor Flow - unauthenticated user without invite code */}
          {isVisitor && (
            <div className="space-y-6">
              <ReferralAuthPrompt
                redirectTo="/referral"
                title="Create your account to get your referral link"
                description="Sign up to generate your unique referral link and share a 50% off lifetime offer with friends."
              />
            </div>
          )}

          {/* Referrer Flow */}
          {isReferrer && (
            <div className="w-full space-y-6">
              {referralError && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-800 dark:bg-red-900/20"
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <h3 className="mb-2 text-xl font-medium text-red-900 dark:text-red-100">
                        We couldn’t load your referral code
                      </h3>
                      <p className="text-red-700 dark:text-red-300">
                        {referralError instanceof Error
                          ? referralError.message
                          : "Please refresh and try again"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Show loading skeleton while data loads */}
              {referralLoading && (
                <div className="bg-card border-subtle-border max-w-5xl animate-pulse rounded-3xl border p-8 shadow-sm">
                  <div className="bg-subtle-background mb-6 h-6 w-1/3 rounded" />
                  <div className="bg-subtle-background mb-6 h-16 w-full rounded" />
                  <div className="bg-subtle-background mb-4 h-10 w-full rounded" />
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-subtle-background h-10 rounded" />
                    <div className="bg-subtle-background h-10 rounded" />
                  </div>
                </div>
              )}

              {/* Show card with data when loaded */}
              {referralCode && !referralLoading && (
                <div>
                  <ReferrerCodeCard
                    code={referralCode}
                    acceptanceCount={acceptanceCount}
                    completedCount={completedCount}
                    trialEnd={subTrialEnd ?? trialEnd}
                    isTrialing={subIsTrialing || isTrialing}
                    trialEligible={subTrialEligible}
                    onStartTrial={openAppStore}
                  />
                  <ReferralAcceptanceList acceptances={acceptedBy} />
                </div>
              )}
            </div>
          )}
        </section>
        {/* Full-bleed Mobile App Preview Section (wider) */}
        {
          <section className="relative z-10 flex flex-col items-center overflow-hidden px-4 py-20 sm:px-8 lg:px-8">
            <motion.div
              className="mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="mb-16 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h2 className="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  Try the Moneko App Today
                </h2>
                <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
                  Explore Moneko while your friend joins. They can redeem 50%
                  off the lifetime plan right from your referral flow.
                </p>

                <div className="mt-6 mb-4 flex flex-col gap-3 lg:flex-row">
                  <AppleDownloadButton />
                  <AndroidDownloadButton />
                </div>
                <motion.a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Connect on Discord"
                  className="text-dark-foreground inline-flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <FontAwesomeIcon
                    icon={faDiscord}
                    className="h-3 w-3 sm:h-4 sm:w-4"
                  />
                  Join Discord for instant support
                </motion.a>
              </motion.div>

              <Carousel
                className="h-[560px] w-screen md:h-[640px] lg:h-[640px] xl:h-[680px] 2xl:h-[720px]"
                items={mobilePreview.map((mockup, index) => (
                  <motion.div
                    key={index}
                    className="relative flex flex-col items-center"
                  >
                    <h3 className="text-foreground w-[70%] -translate-y-8 text-lg font-medium">
                      {mockup.title}
                    </h3>
                  </motion.div>
                ))}
                iphoneMockups={mobilePreview.map((mockup) => (
                  <motion.div
                    key={(mockup as any).title}
                    className="flex h-[80%] w-full items-end justify-center"
                  >
                    <img src={mockup.src} className="h-full w-auto" />
                  </motion.div>
                ))}
              />
            </motion.div>
          </section>
        }

        {/* How It Works Section (moved from modal) */}
        {
          <section id="how-it-works" className="mt-16 mb-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="text-foreground mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  How the referral works
                </h2>
                <p className="text-muted-foreground mx-auto max-w-2xl">
                  Share your link, invite a friend, and help them redeem 50% off
                  the lifetime plan.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                {[1, 2, 3, 4].map((num) => (
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
                            {num === 1 && "Share your referral link"}
                            {num === 2 && "Friend creates an account"}
                            {num === 3 && "Discount applies at checkout"}
                            {num === 4 && "They pay and unlock lifetime"}
                          </h3>
                          <p className="text-muted-foreground">
                            {num === 1 &&
                              "Copy your referral link and share it by text, WhatsApp, email, or anywhere your friend prefers."}
                            {num === 2 &&
                              "Your friend signs up with your link so the referral offer is attached to their account."}
                            {num === 3 &&
                              "We send them straight to checkout with the 50% lifetime discount already applied."}
                            {num === 4 &&
                              "They enter card details, complete payment, and instantly unlock lifetime access at 50% off."}
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
                      <span className="text-primary mt-0.5">•</span> The
                      referral discount is for the lifetime plan only
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> Your link
                      is unique and you can share it with unlimited friends
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> The 50%
                      discount is applied automatically in the referral checkout
                      flow
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> Card
                      details are required because this is a paid discounted
                      purchase, not a free unlock
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> Track
                      invite accepts and completed checkouts on this page
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        }

        {/* Mobile App Preview moved outside container for wider layout */}

        {/* FAQ will render after the wider carousel to keep order: 1-card, 2-how it works, 3-carousel, 4-FAQ */}
        {false && (
          <section id="faq" className="pb-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-foreground mb-12 text-center text-4xl font-bold tracking-tight sm:mb-16 sm:text-5xl">
                Referral FAQs
              </h2>
              <Accordion
                type="single"
                collapsible
                className="w-full"
                defaultValue={referralFaq.length > 0 ? "item-0" : undefined}
              >
                {referralFaq.map((faq, index) => (
                  <AccordionItem key={`faq-${index}`} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-balance">
                      <p>{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}
      </div>

      {/* FAQ Section */}
      {
        <section id="faq" className="relative z-10 pb-20">
          <div className="mx-auto max-w-5xl px-0 sm:px-8 lg:px-8">
            <h2 className="text-foreground mb-12 text-center text-4xl font-bold tracking-tight sm:mb-16 sm:text-5xl">
              Referral FAQs
            </h2>
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue={referralFaq.length > 0 ? "item-0" : undefined}
            >
              {referralFaq.map((faq, index) => (
                <AccordionItem key={`faq-${index}`} value={`item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-balance">
                    <p>{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      }

      {/* Global overlay while preparing referral checkout */}
      {startingTrial && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-white/90">
            Preparing your referral checkout...
          </p>
        </div>
      )}

      {/* How It Works Modal removed; content now inline section */}
    </div>
  );
}
