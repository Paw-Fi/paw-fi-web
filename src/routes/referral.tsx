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
import { Download, AlertCircle,  HelpCircle, ArrowLeft } from 'lucide-react';
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
import { useValidateReferral } from '@/hooks/use-validate-referral';
import { useAcceptReferral } from '@/hooks/use-accept-referral';
import { useEffect, useRef, useState } from 'react';
// import { InviteeRegisterCard } from '@/components/referral/invitee-register-card';
import { AcceptInvitationCard } from '@/components/referral/accept-invitation-card';
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
import AppleLogo from '@assets/images/shared/apple-logo.png'

// Route search params type
type ReferralSearch = {
  code?: string;
  status?: 'success' | 'canceled';
  session_id?: string;
  flow?: 'trial' | 'referral' | string;
};

export const Route = createFileRoute('/referral')({
  component: ReferralPage,
  validateSearch: (search: Record<string, unknown>): ReferralSearch => ({
    code: search.code as string | undefined,
    status: search.status as 'success' | 'canceled' | undefined,
    session_id: search.session_id as string | undefined,
  }),
  head: () => {
    const pageUrl = getCanonicalUrl('/referral');
    const title = 'Refer Friends | Get Lifetime Access Free | Moneko';
    const description =
      'Invite your friends to Moneko and both get lifetime premium access for free. Share your referral code and unlock premium features together.';

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
    question: 'How does the referral program work?',
    answer:
      'Share your unique referral code with friends. When they sign up using your code and complete their registration, both you and your friend will receive lifetime premium access to Moneko automatically.',
  },
  {
    question: 'Is there a limit to how many friends I can refer?',
    answer:
      'No! You can refer unlimited friends. Each successful referral earns both you and your friend lifetime premium access. The more friends you refer, the more people you help join our community.',
  },
  {
    question: 'When do I get my premium access?',
    answer:
      'Premium access is activated automatically once your friend completes their registration process. This usually happens within 24 hours of them accepting your invitation and completing checkout.',
  },
  {
    question: 'Can I track my referrals?',
    answer:
      'Yes! On this page you can see how many people have accepted your invitation and how many have completed registration. You\'ll see a list of friends who joined and their status.',
  },
  {
    question: 'What if my friend already has an account?',
    answer:
      'Referral codes only work for new users who don\'t have an existing Moneko account. If your friend already has an account, they won\'t be able to use your referral code.',
  },
];

// Mobile preview cards data (reuse couple-budgeting mockups)
const mobilePreview = [
  { src: phone1, title: 'Link accounts, view, and manage together', description: 'Log groceries, bills, and date nights. See who paid for what, instantly.' },
  { src: phone2, title: 'Add expenses, split bills fast and fair', description: 'Watch your savings for that dream home or vacation grow together.' },
  { src: phone3, title: 'Get notified, confirm, and stay aligned', description: 'Set up shared budgets for joint costs and keep personal spending separate.' },
  { src: phone4, title: 'Set goals, track, and celebrate together', description: 'AI identifies trends and opportunities for you to save more as a team.' },
  { src: phone5, title: 'Scan receipts in WhatsApp, log automatically', description: 'AI identifies trends and opportunities for you to save more as a team.' },
];

function ReferralPage() {
  const { code } = Route.useSearch();
  const { status, session_id, flow } = Route.useSearch();
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();

  // State for timeout UI
  const [showTimeout, setShowTimeout] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  // UI state

  // Ref to prevent multiple validation calls
  const hasValidatedRef = useRef(false);

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
  } = useReferralCode({ enabled: !!user && !code });

  // Use subscription as source-of-truth for trial state/eligibility
  const { subscription, isLoading: subscriptionLoading } = useSubscription(user?.id);
  const subIsTrialing = Boolean(subscription && subscription.status === 'trialing');
  const subTrialEnd = subIsTrialing ? (subscription?.current_period_end ?? null) : null;
  const subTrialEligible = !subscription || subscription.plan === 'free';

  // Validate referral code if present in URL
  const {
    validate,
    isLoading: validateLoading,
    isValid,
    referrerInfo,
    error: validateError,
  } = useValidateReferral();

  // Accept referral mutation
  const { accept, isLoading: acceptLoading } = useAcceptReferral();

  // Validation function
  const validateReferralCode = async () => {
    if (!code) return;
    try {
      await validate(code);
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  // Kick off validation ASAP when a code is present (public endpoint)
  useEffect(() => {
    if (!code) return;
    if (hasValidatedRef.current) return;
    if (isValid || referrerInfo !== null || validateError) return;
    hasValidatedRef.current = true;
    validateReferralCode();
  }, [code]);

  // Defensive: If user is authenticated but initial validation didn't run (race), try again
  useEffect(() => {
    if (userLoading) return;
    if (!user || !code) return;
    if (isValid || referrerInfo !== null || validateError) return;
    if (hasValidatedRef.current) return;
    hasValidatedRef.current = true;
    validateReferralCode();
  }, [userLoading, user, code, isValid, referrerInfo, validateError]);

  // 10-second timeout for validation
  useEffect(() => {
    if (!validateLoading) return;

    const timeoutId = setTimeout(() => {
      if (validateLoading && !referrerInfo && !validateError) {
        setShowTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [validateLoading, referrerInfo, validateError]);

  // Handle accept invitation
  const handleAcceptInvitation = async () => {
    if (!code || !user) return;
    await accept(code);
  };

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
  const isInvitee = !!code;
  const isReferrer = !code && !!user;

  // Note: No full-page loading. We will render skeletons for sections below.

  return (
    <div className="min-h-screen bg-moneko-background relative overflow-hidden">
      {/* Header - same as couple-budgeting */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/70 backdrop-blur-xl border-b border-subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-4 h-4" />
              Back to Home
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
        {/* Checkout status banner */}
        {status === 'success' && (!flow || flow !== 'trial') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-green-200 dark:border-green-900/40 bg-green-50/80 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200"
          >
            🎉 Checkout completed successfully. Your lifetime access will be activated shortly.
          </motion.div>
        )}
        {/* Post-accept: show Download App card only after invite acceptance */}
        {status === 'success' && (!flow || flow !== 'trial') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="bg-subtle-background rounded-2xl p-3 shrink-0">
                <Download className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-foreground mb-2">Download the App</h3>
                <p className="text-muted-foreground mb-4">Get started with Moneko on your iPhone or iPad</p>
                <a
                  href="https://testflight.apple.com/join/Q9rNbkN5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black px-6 py-4 md:px-8 md:py-5 text-base md:text-lg font-semibold shadow-sm hover:opacity-90 transition"
                >
                  <img src={AppleLogo} className="h-5" />
                  Download on TestFlight
                </a>
              </div>
            </div>
          </motion.div>
        )}
        {status === 'canceled' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          >
            Checkout was canceled. You can retry accepting the invitation anytime.
          </motion.div>
        )}
        {/* Header */}
        <motion.div
   
          className="text-center mb-12"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight mb-4">
            {isInvitee ? 'Join Moneko Premium' : 'Invite Friends to Moneko'}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
            {isInvitee
              ? 'Accept your invitation and unlock lifetime premium access for both you and your friend'
              : 'Share your referral code and both you and your friend get lifetime premium access when they join'}
          </p>
          {!isInvitee && (
            <Button asChild variant="link" className="text-primary">
              <a href="#how-it-works" className="inline-flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                How It Works
              </a>
            </Button>
          )}
        </motion.div>

        {/* Invitee Flow */}
        {isInvitee && (
          <div className="space-y-6">
            {/* While auth is resolving, show a neutral skeleton (prevents flashing auth prompt) */}
            {userLoading && (
              <div className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border animate-pulse">
                <div className="h-6 bg-subtle-background rounded w-1/3 mb-6" />
                <div className="h-10 bg-subtle-background rounded w-full mb-4" />
                <div className="h-10 bg-subtle-background rounded w-1/2" />
              </div>
            )}

            {/* If not authenticated: show reusable auth prompt rather than redirect */}
            {!userLoading && !user && (
              <ReferralAuthPrompt
                code={code}
                redirectTo={code ? `/referral?code=${code}` : '/referral'}
                title="Join to accept your invite"
                description="Sign in or create an account to accept the invitation and start your free trial."
              />
            )}

            {/* Step 2: Accept Invitation (for authenticated users) */}
            {!userLoading && user && validateLoading && (
              <div className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border animate-pulse">
                <div className="h-6 bg-subtle-background rounded w-1/3 mb-6" />
                <div className="h-10 bg-subtle-background rounded w-full mb-4" />
                <div className="h-10 bg-subtle-background rounded w-1/2" />
              </div>
            )}

            {!userLoading && user && !validateLoading && isValid && referrerInfo && (
              <AcceptInvitationCard
                code={code}
                referrerEmail={referrerInfo.email}
                onAccept={handleAcceptInvitation}
                isLoading={acceptLoading}
              />
            )}

            {!userLoading && user && !validateLoading && !isValid && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 shadow-sm border border-red-200 dark:border-red-800"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                      Invalid Referral Code
                    </h3>
                    <p className="text-red-700 dark:text-red-300">
                      This referral code is invalid or has expired. Please check the code and try
                      again.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Download App card moved to post-accept section */}
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
                      Error Loading Referral Code
                    </h3>
                    <p className="text-red-700 dark:text-red-300">
                      {referralError instanceof Error
                        ? referralError.message
                        : 'Failed to load referral code'}
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
        {!isInvitee && (
          <section id="how-it-works" className="mt-16 mb-20">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">How it works</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Share your code, help friends join, and both enjoy lifetime premium.
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
                            {num === 1 && 'Share Your Code'}
                            {num === 2 && 'Claim a Free Trial'}
                            {num === 3 && 'Friend Signs Up'}
                            {num === 4 && 'Both Get Premium'}
                          </h3>
                          <p className="text-muted-foreground">
                            {num === 1 && 'Copy your unique referral link and share it with friends via email, social media, or messaging apps.'}
                             {num === 2 && <span className="font-semibold text-primary underline cursor-pointer" onClick={handleStartTrial} >Claim a free 1-month trial</span>}
                            {num === 2 && ' to get temporary access to explore our app while waiting for your friend to join.'}
                            {num === 3 && 'Your friend creates their Moneko account using your referral link and accepts the invitation.'}
                            {num === 4 && 'Once completed, both you and your friend receive lifetime premium access automatically!'}
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
                  <h4 className="font-medium text-foreground mb-3">Important Notes</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Both you and your friend must complete the registration process</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Referral codes are unique and can be shared with unlimited friends</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Premium access is activated automatically once both parties complete registration</li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> You can track your referral progress on this page</li>
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
              <h2 className="text-center text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-12 sm:mb-16">Your Questions, Answered</h2>
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
  {!isInvitee && (
    <section className="px-4 sm:px-8 lg:px-8 py-20 relative overflow-hidden">
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
                Explore the App Experience
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                A glimpse of how Moneko looks and feels on mobile
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
  {!isInvitee && (
    <section id="faq" className="pb-20">
      <div className="mx-auto max-w-5xl px-0 sm:px-8 lg:px-8">
        <h2 className="text-center text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-12 sm:mb-16">
          Your Questions, Answered
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
