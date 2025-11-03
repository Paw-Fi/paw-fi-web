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
import { Download, AlertCircle, ExternalLink, Clock, HelpCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision';
import { Carousel } from '@/components/ui/apple-cards-carousel';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/auth-context';
import { useReferralCode } from '@/hooks/use-referral-code';
import { useValidateReferral } from '@/hooks/use-validate-referral';
import { useAcceptReferral } from '@/hooks/use-accept-referral';
import { useEffect, useRef, useState } from 'react';
import { InviteeRegisterCard } from '@/components/referral/invitee-register-card';
import { AcceptInvitationCard } from '@/components/referral/accept-invitation-card';
import { ReferrerCodeCard } from '@/components/referral/referrer-code-card';
import { ReferralAcceptanceList } from '@/components/referral/referral-acceptance-list';
import { HowItWorksModal } from '@/components/referral/how-it-works-modal';
import { MonekoIcon } from '@/components/shared/moneko-icon';
import phone1 from '@assets/images/couple-budgeting/1.png'
import phone2 from '@assets/images/couple-budgeting/2.png'
import phone3 from '@assets/images/couple-budgeting/3.png'
import phone4 from '@assets/images/couple-budgeting/4.png'
import phone5 from '@assets/images/couple-budgeting/5.png'

// Route search params type
type ReferralSearch = {
  code?: string;
  status?: 'success' | 'canceled';
  session_id?: string;
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
  const { status, session_id } = Route.useSearch();
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();

  // State for timeout UI
  const [showTimeout, setShowTimeout] = useState(false);

  // State for How It Works modal
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
  } = useReferralCode({ enabled: !!user && !code });

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

  // Wait for auth check, then validate referral or redirect to login
  useEffect(() => {
    // Don't do anything until auth check is complete
    if (userLoading) return;

    // If not authenticated, redirect to login with current URL
    if (!user) {
      const currentPath = code ? `/referral?code=${code}` : '/referral';
      navigate({
        to: '/register',
        search: { redirect: currentPath, ...(code && { code }) },
      });
      return;
    }

    // User is authenticated with code (invitee flow), validate if we haven't already
    if (user && code && !isValid && referrerInfo === null && !validateError && !hasValidatedRef.current) {
      hasValidatedRef.current = true;
      validateReferralCode();
    }
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

  // Determine which view to show
  const isInvitee = !!code;
  const isReferrer = !code && !!user;

  // Loading state
  if (userLoading || validateLoading || (isReferrer && referralLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-moneko-background px-4">
        <div className="text-center max-w-md">
          {!showTimeout ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-moneko-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-moneko-muted-foreground">
                {validateLoading ? 'Validating referral code...' : 'Loading...'}
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="mb-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-moneko-foreground mb-3">
                Taking longer than expected
              </h2>
              <p className="text-moneko-muted-foreground mb-8">
                The referral code validation is taking longer than usual. Please refresh the page to try again.
              </p>
              <motion.button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-6 py-4 rounded-full font-medium hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Refresh Page
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-moneko-background relative overflow-hidden">
      {/* Header - same as couple-budgeting */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: '/' })}
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
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        {/* Checkout status banner */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/80 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200"
          >
            🎉 Checkout completed successfully. Your lifetime access will be activated shortly.
          </motion.div>
        )}
        {status === 'canceled' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          >
            Checkout was canceled. You can retry accepting the invitation anytime.
          </motion.div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-moneko-foreground mb-4">
            {isInvitee ? 'Join Moneko Premium' : 'Invite Friends to Moneko'}
          </h1>
          <p className="text-lg text-moneko-muted-foreground max-w-2xl mx-auto mb-6">
            {isInvitee
              ? 'Accept your invitation and unlock lifetime premium access for both you and your friend'
              : 'Share your referral code and both you and your friend get lifetime premium access when they join'}
          </p>
          {!isInvitee && (
            <motion.button
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center gap-2 text-sm text-moneko-primary hover:text-moneko-primary/80 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <HelpCircle className="w-4 h-4" />
              How It Works
            </motion.button>
          )}
        </motion.div>

        {/* Invitee Flow */}
        {isInvitee && (
          <div className="space-y-6">
            {/* Step 1: Register (for non-authenticated users) */}
            {!user && <InviteeRegisterCard code={code} />}

            {/* Step 2: Accept Invitation (for authenticated users) */}
            {user && validateLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moneko-primary mx-auto mb-4"></div>
                  <p className="text-moneko-foreground">Validating invitation...</p>
                </div>
              </motion.div>
            )}

            {user && !validateLoading && isValid && referrerInfo && (
              <AcceptInvitationCard
                code={code}
                referrerEmail={referrerInfo.email}
                onAccept={handleAcceptInvitation}
                isLoading={acceptLoading}
              />
            )}

            {user && !validateLoading && !isValid && (
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

            {/* Download TestFlight Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="flex items-start gap-4">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-3 shrink-0">
                  <Download className="w-6 h-6 text-moneko-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-moneko-foreground mb-2">
                    Download the App
                  </h3>
                  <p className="text-moneko-muted-foreground mb-4">
                    Get started with Moneko on your iPhone or iPad
                  </p>
                  <a
                    href="https://testflight.apple.com/join/YOUR_TESTFLIGHT_CODE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity"
                  >
                    Download TestFlight
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
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
                className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 shadow-sm border border-red-200 dark:border-red-800"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
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

            {referralCode && (
              <>
                <ReferrerCodeCard
                  code={referralCode}
                  acceptanceCount={acceptanceCount}
                  completedCount={completedCount}
                />
                <ReferralAcceptanceList acceptances={acceptedBy} />
              </>
            )}
          </div>
        )}

        {/* Mobile App Preview Section - same mockup carousel */}
        {!isInvitee && (
          <section className="px-6 py-20 relative overflow-hidden">
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
                <h2 className="text-4xl sm:text-5xl font-bold text-moneko-foreground tracking-tight mb-6">
                  Explore the App Experience
                </h2>
                <p className="text-lg text-moneko-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  A glimpse of how Moneko looks and feels on mobile
                </p>
              </motion.div>

              <Carousel
                className="h-[540px] md:h-[620px] lg:h-[600px] xl:h-[600px] 2xl:h-[700px]"
                items={mobilePreview.map((mockup, index) => (
                  <motion.div
                    key={index}
                    className="relative flex flex-col items-center"
                  >
                    <h3 className="text-lg font-semibold text-moneko-foreground -translate-y-8 w-[70%]">
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

        {/* FAQ Section */}
        {!isInvitee && (
          <section id="faq" className="pb-20">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-center text-2xl sm:text-3xl font-bold text-moneko-foreground mb-12 sm:mb-16">
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
      </div>

      {/* How It Works Modal */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
}
