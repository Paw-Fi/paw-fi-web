/**
 * Referral Page
 *
 * Landing page for referral system with three steps:
 * 1. Register (for new users)
 * 2. Your referral code (for existing users)
 * 3. Download TestFlight (after someone accepts)
 *
 * Design matches couple-budgeting.tsx style with BackgroundBeamsWithCollision + DotPattern
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision';
import { Carousel } from '@/components/ui/apple-cards-carousel';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useReferralCode } from '@/hooks/use-referral-code';
import { useState } from 'react';
import { ReferrerCodeCard } from '@/components/referral/referrer-code-card';
import { ReferralAcceptanceList } from '@/components/referral/referral-acceptance-list';
import { MonekoIcon } from '@/components/shared/moneko-icon';
import { ReferralAuthPrompt } from '@/components/auth/referral-auth-prompt';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSubscription } from '@/hooks/use-subscription';
import phone1 from '@assets/images/couple-budgeting/1.png'
import phone2 from '@assets/images/couple-budgeting/2.png'
import phone3 from '@assets/images/couple-budgeting/3.png'
import phone4 from '@assets/images/couple-budgeting/4.png'
import phone5 from '@assets/images/couple-budgeting/5.png'

// Route search params type
type ReferralSearch = {
  status?: 'success' | 'canceled';
  session_id?: string;
  flow?: 'trial' | 'referral' | string;
};

export const Route = createFileRoute('/referral/')({
  component: ReferralPage,
  validateSearch: (search: Record<string, unknown>): ReferralSearch => ({
    status: search.status as 'success' | 'canceled' | undefined,
    session_id: search.session_id as string | undefined,
    flow: search.flow as string | undefined,
  }),
  head: () => {
    const pageUrl = getCanonicalUrl('/referral');
    const title = 'Invite Friends to Moneko | Get Lifetime Premium Access';
    const description =
      'Invite a friend to Moneko, the couples budgeting app, and you’ll both unlock lifetime premium access. Share your referral link to start budgeting better together.';

    const meta = seo({
      title,
      description,
      url: pageUrl,
    });

    return {
      meta,
      link: [{ rel: 'canonical', href: pageUrl }],
    };
  },
});

// FAQ data for referral system
const referralFaq = [
  {
    question: 'How does the Moneko referral program work?',
    answer:
      'Share your unique referral link with a friend. When they sign up using your link and complete sign‑up, you both receive lifetime premium access to Moneko automatically.',
  },
  {
    question: 'Who is eligible for lifetime premium access?',
    answer:
      'New users who join Moneko through your referral link are eligible. When your friend completes sign‑up with your link, both accounts unlock lifetime premium access.',
  },
  {
    question: 'Does my friend need to pay or add a card?',
    answer:
      'No purchase is required to receive lifetime premium access through the referral program.',
  },
  {
    question: 'How do I find and share my referral link?',
    answer:
      'Sign in and visit this page to copy your referral link. Share it via text, WhatsApp, email, or social—whatever your friend prefers.',
  },
  {
    question: 'How long until lifetime premium is applied?',
    answer:
      'In most cases, access is applied instantly after your friend completes sign‑up. In rare cases, it may take up to 24 hours.',
  },
  {
    question: 'Is there a limit to how many friends I can invite?',
    answer:
      'There is no limit. Invite as many friends as you like—each completed referral grants lifetime premium access to both of you.',
  },
  {
    question: 'What if my friend forgot to use my link?',
    answer:
      'Ask them to sign up again using your referral link. If they already created an account, contact support and we’ll help if eligible.',
  },
  {
    question: 'Can I track who joined with my link?',
    answer:
      'Yes. This page shows who accepted your invite and who completed sign‑up, so you can see when lifetime premium access should apply.',
  },
];

// Mobile preview cards data (reuse couple-budgeting mockups)
const mobilePreview = [
  { src: phone1, title: 'Link accounts and manage money together', description: 'Log groceries, bills, and date nights. See who paid—instantly.' },
  { src: phone2, title: 'Add expenses and split fairly', description: 'Watch shared savings grow toward your next trip or big goal.' },
  { src: phone3, title: 'Stay aligned with real‑time alerts', description: 'Create shared budgets and keep personal spending separate.' },
  { src: phone4, title: 'Set goals and celebrate progress', description: 'Smart insights spot trends and help couples save more.' },
  { src: phone5, title: 'Scan receipts in WhatsApp', description: 'Auto‑log spending from chats for fast, accurate tracking.' },
];

function ReferralPage() {
  const { status, session_id, flow } = Route.useSearch();
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();

  // State for trial starter
  const [startingTrial, setStartingTrial] = useState(false);

  // Fetch referral code for authenticated users
  const {
    code: referralCode,
    createdAt,
    acceptanceCount,
    completedCount,
    acceptedBy,
    isLoading: referralLoading,
    error: referralError,
    trialStart,
    trialEnd,
    isTrialing,
    trialEligible,
  } = useReferralCode({ enabled: !!user });

  // Use subscription as source-of-truth for trial state/eligibility
  const { subscription, isLoading: subscriptionLoading } = useSubscription(user?.id);
  const subIsTrialing = Boolean(subscription && subscription.status === 'trialing');
  const subTrialEnd = subIsTrialing ? (subscription?.current_period_end ?? null) : null;
  const subTrialEligible = !subscription || subscription.plan === 'free';

  // Trial starter centralized so both card link and minimal link use the same flow
  const handleStartTrial = async (e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault();
    try {
      if (startingTrial) return;
      setStartingTrial(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: '/register', search: { redirect: '/referral?flow=trial' } });
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'plus',
          billingInterval: 'monthly',
          successUrl: `${window.location.origin}/referral?status=success&flow=trial&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/referral?status=canceled`,
        }),
      });
      if (!res.ok) {
        // swallow details in UI; logs on server will have more context
        return;
      }
      const json = await res.json();
      if (json.checkoutUrl) window.location.href = json.checkoutUrl as string;
    } finally {
      setStartingTrial(false);
    }
  };

  // Determine which view to show
  // Referrer: logged in user who can share their code
  const isReferrer = !!user;
  // Visitor: not logged in, needs to see auth prompt
  const isVisitor = !user && !userLoading;

  // Note: No full-page loading. We will render skeletons for sections below.

  return (
    <div className="min-h-screen bg-moneko-background relative overflow-hidden px-4 pt-2">
      {/* Header - same as couple-budgeting */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/70 backdrop-blur-xl border-b border-subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-4 h-4" />
              Back to Moneko
            </Button>
          </div>
        </div>
      </header>
      {/* Background Beams with Collision - match couple-budgeting (fixed to viewport) */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen" />

      {/* Dotted grid pattern overlay - same style as couple-budgeting */}
      <DotPattern
        className="fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1] [mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-0 sm:px-8 lg:px-8 py-20">
        {/* Header */}
        <motion.div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight mb-4">
            Invite a Friend — Get Lifetime Premium Access
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
            Share your referral link. When a friend joins Moneko, you both unlock lifetime premium access for smarter couples budgeting.
          </p>
          <Button asChild variant="link" className="text-primary">
            <a href="#how-it-works" className="inline-flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              How it works
            </a>
          </Button>
        </motion.div>

        {/* Visitor Flow - unauthenticated user without invite code */}
        {isVisitor && (
          <div className="space-y-6">
            <ReferralAuthPrompt
              redirectTo="/referral"
              title="Create your account to get your referral link"
              description="Sign up to generate your unique referral link. When your friend joins with your link, you both get lifetime premium access."
            />
          </div>
        )}

        {/* Referrer Flow */}
        {isReferrer && (
          <div className="space-y-6">
            {referralError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-8 shadow-sm border border-red-200 dark:border-red-800"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <h3 className="text-xl font-medium text-red-900 dark:text-red-100 mb-2">
                      We couldn’t load your referral code
                    </h3>
                    <p className="text-red-700 dark:text-red-300">
                      {referralError instanceof Error
                        ? referralError.message
                        : 'Please refresh and try again'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {referralLoading && (
              <div className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border animate-pulse">
                <div className="h-6 bg-subtle-background rounded w-1/3 mb-6" />
                <div className="h-16 bg-subtle-background rounded w-full mb-6" />
                <div className="h-10 bg-subtle-background rounded w-full mb-4" />
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="h-10 bg-subtle-background rounded" />
                  <div className="h-10 bg-subtle-background rounded" />
                </div>
              </div>
            )}

            {referralCode && !referralLoading && (
              <>
                <ReferrerCodeCard
                  code={referralCode}
                  acceptanceCount={acceptanceCount}
                  completedCount={completedCount}
                  trialEnd={subTrialEnd ?? trialEnd}
                  isTrialing={subIsTrialing || isTrialing}
                  trialEligible={subTrialEligible}
                  onStartTrial={handleStartTrial}
                />
                <ReferralAcceptanceList acceptances={acceptedBy} />
              </>
            )}
          </div>
        )}

             {/* How It Works Section (moved from modal) */}
        {(
          <section id="how-it-works" className="mt-16 mb-20">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">How the referral works</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Share your link, invite a friend, and you’ll both get lifetime premium access.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {[1,2,3,4].map((num) => (
                  <Card key={num} className="rounded-3xl border-subtle-border">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="rounded-full w-8 h-8 bg-subtle-background text-foreground flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium">{num}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground">Step {num}</span>
                          <h3 className="text-lg font-medium text-foreground mt-1 mb-1">
                            {num === 1 && 'Share your referral link'}
                            {num === 2 && 'Start a free trial'}
                            {num === 3 && 'Friend joins with your link'}
                            {num === 4 && 'Both get lifetime premium'}
                          </h3>
                          <p className="text-muted-foreground">
                            {num === 1 && 'Copy your referral link and share it by text, WhatsApp, email, or anywhere your friend prefers.'}
                            {num === 2 && <span className="font-semibold text-primary underline cursor-pointer" onClick={handleStartTrial}>Start a free 1-month trial</span>}
                            {num === 2 && ' to explore Moneko today while your friend joins.'}
                            {num === 3 && 'Your friend signs up with your link and accepts the invitation.'}
                            {num === 4 && 'After they join, you both receive lifetime premium access automatically.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Notes */}
              <Card className="rounded-3xl mt-8 border-subtle-border">
                <CardContent className="p-6">
                  <h4 className="font-medium text-foreground mb-3">Good to know</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Both you and your friend must complete sign-up</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Your link is unique and you can share it with unlimited friends</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Lifetime premium access activates automatically once your friend completes sign-up</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Track invite accepts and completions on this page</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        )}


        {/* Mobile App Preview moved outside container for wider layout */}

   
        {/* FAQ will render after the wider carousel to keep order: 1-card, 2-how it works, 3-carousel, 4-FAQ */}
        {false && (
          <section id="faq" className="pb-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-12 sm:mb-16">Referral FAQs</h2>
              <Accordion type="single" collapsible className="w-full" defaultValue={referralFaq.length > 0 ? 'item-0' : undefined}>
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

      {/* Full-bleed Mobile App Preview Section (wider) */}
  {(
    <section className="px-4 sm:px-8 lg:px-8 py-20 relative z-10 overflow-hidden">
      <motion.div
        className="max-w-7xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-6">
                See Moneko in action
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Preview the couples budgeting experience on mobile
              </p>
            </motion.div>

            <Carousel
              className="h-[560px] md:h-[640px] lg:h-[640px] xl:h-[680px] 2xl:h-[720px]"
              items={mobilePreview.map((mockup, index) => (
                <motion.div
                  key={index}
                  className="relative flex flex-col items-center"
                >
                  <h3 className="text-lg font-medium text-foreground -translate-y-8 w-[70%]">
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
  )}

  {/* FAQ Section after carousel (same width as main content) */}
  {(
    <section id="faq" className="pb-20 relative z-10">
      <div className="mx-auto max-w-5xl px-0 sm:px-8 lg:px-8">
        <h2 className="text-center text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-12 sm:mb-16">
          Referral FAQs
        </h2>
        <Accordion type="single" collapsible className="w-full" defaultValue={referralFaq.length > 0 ? 'item-0' : undefined}>
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

  {/* Global overlay while creating no-card trial */}
  {startingTrial && (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/90 font-medium">Starting your free trial…</p>
    </div>
  )}

    {/* How It Works Modal removed; content now inline section */}
    </div>
  );
}
