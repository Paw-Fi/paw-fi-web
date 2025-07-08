import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { Switch } from "@/components/ui/switch";
import React, { useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toast } from "react-toastify";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { FeatureItem, PricingTier, getPricingTiers } from "@/data/pricing-plans";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faRocket } from "@fortawesome/free-solid-svg-icons";
import { HomeHeader } from "@/components/index/header";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title: "Pricing Plans | Moneko",
      description:
        "Choose the perfect Moneko plan to kickstart your financial journey. From free starter packs to premium investment tools, find what fits you.",
      keywords:
        "pricing, plans, subscription, finance app, moneko, financial education, investment tools, budgeting app",
      image: "https://moneko.io/og-img.png", // Placeholder - ensure an appropriate OG image is created
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko Subscription Plans",
      description:
        "Subscription plans for Moneko financial education and management application.",
      image: "https://moneko.io/og-img.png",
      brand: {
        "@type": "Brand",
        name: "Moneko",
      },
      offers: {
        "@type": "OfferCatalog",
        name: "Moneko Subscription Plans",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Free Plan - Starter Pack",
            price: "0",
            priceCurrency: "USD",
            description:
              "Perfect if you’re just starting your financial journey.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Plus Plan - Money Mover",
            priceSpecification: [
              {
                "@type": "PriceSpecification",
                price: "9",
                priceCurrency: "USD",
                billingDuration: "P1M", // ISO 8601 duration for 1 month
              },
              {
                "@type": "PriceSpecification",
                price: "79",
                priceCurrency: "USD",
                billingDuration: "P1Y", // ISO 8601 duration for 1 year
              },
            ],
            description: "Great if you want deeper tools and investing prep.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Premium Plan - Invest & Thrive",
            priceSpecification: [
              {
                "@type": "PriceSpecification",
                price: "19",
                priceCurrency: "USD",
                billingDuration: "P1M",
              },
              {
                "@type": "PriceSpecification",
                price: "149",
                priceCurrency: "USD",
                billingDuration: "P1Y",
              },
            ],
            description:
              "For users serious about mastering money & building wealth.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
        ],
      },
    };

    return {
      meta,
      link: [
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

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2, duration: 0.5 },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] },
  },
};

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [billingPeriodMessage, setBillingPeriodMessage] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get pricing tiers from shared data module
  const pricingTiers = getPricingTiers(isAnnual);

  const handleBillingToggle = (toggled: boolean) => {
    setIsAnnual(toggled);
    setBillingPeriodMessage(
      toggled ? "Displaying annual pricing." : "Displaying monthly pricing.",
    );
  };
  
  const handleSubscribe = async (plan: string) => {
    try {
      setIsLoading(true);
      
      // Get the current user ID if logged in
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      if (!userId) {
        toast.error("Please sign in to subscribe");
        navigate({ to: "/login" });
        setIsLoading(false);
        return;
      }
      
      const billingInterval = isAnnual ? "yearly" : "monthly";
      
      // Create success and cancel URLs for the checkout session
      const origin = window.location.origin;
      const successUrl = `${origin}/payment-status?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/payment-status?status=canceled`;
      
      // Call the create-checkout-session function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          plan, 
          billingInterval, 
          userId,
          successUrl,
          cancelUrl
        },
      });
      
      if (error) {
        console.error('Error creating checkout session:', error);
        toast.error('Failed to create checkout session. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Redirect to checkout page with plan and billing interval
      navigate({
        to: '/checkout',
        search: { plan, billing: billingInterval },
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error handling subscription:', err);
      toast.error('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <AmbientHaloLayout>
      <HomeHeader/>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"} // Use undefined for props if variants are undefined
        animate={prefersReducedMotion ? undefined : "visible"}
        exit={prefersReducedMotion ? undefined : "exit"}
        variants={prefersReducedMotion ? undefined : pageVariants}
        className="container mx-auto min-h-screen px-4 py-12 md:py-20"
      >
        <motion.header
          // Removed variants from header as children are individually animated
          className="mb-12 text-center md:mb-16"
        >
          <motion.h1
            className="mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400"
            variants={prefersReducedMotion ? undefined : cardVariants} // Re-use card variant for simple entrance
          >
            Choose Your Path to Financial Freedom
          </motion.h1>
          <motion.p
            className="mx-auto max-w-2xl text-lg text-gray-700 md:text-xl dark:text-gray-300"
            variants={prefersReducedMotion ? undefined : cardVariants}
          >
            Simple, transparent pricing. All plans are designed to help you
            learn, save, and invest smarter with Moneko.
          </motion.p>

          <motion.div
            className="mt-10 flex justify-center"
            variants={prefersReducedMotion ? undefined : cardVariants} // Animate with other header elements
          >
            <Switch
              labelLeft="Monthly"
              labelRight="Annually (Save up to 25%)"
              onToggle={handleBillingToggle}
              initialToggled={isAnnual}
              srText="Toggle billing period"
            />
          </motion.div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {billingPeriodMessage}
          </span>
        </motion.header>

        <motion.div
          className="mt-8 flex flex-wrap gap-6 justify-center"
          variants={prefersReducedMotion ? undefined : gridVariants}
        >
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.title}
              variants={prefersReducedMotion ? undefined : cardVariants}
              className={`relative flex w-[30rem] flex-col rounded-xl p-6 shadow-2xl md:p-8 ${tier.bgColor} ${tier.textColor} ${tier.borderColor ? `border-2 ${tier.borderColor}` : ""} group bg-opacity-70 backdrop-blur-xl dark:bg-opacity-70`}
            >
              {tier.badgeText && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                  {tier.badgeText}
                </div>
              )}
              <div className="flex flex-grow flex-col p-6 md:p-8">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tier.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tier.subtitle}
                  </p>
                </div>

                <div className="mb-6 min-h-[90px] text-center">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {isAnnual && tier.priceYearly
                      ? tier.priceYearly.replace("/year", "")
                      : tier.priceMonthly}
                  </span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                    {isAnnual && tier.priceYearly
                      ? "/year"
                      : tier.priceFrequencyText}
                  </span>
                  {tier.priceYearly&&tier.title!="Free Plan" && (
                    <p
                      className={`mt-1 text-xs font-semibold text-purple-600 transition-opacity duration-300 dark:text-purple-400 ${isAnnual ? "opacity-100" : "opacity-0"}`}
                    >
                      Save {tier.title === "Plus Plan" ? "$29" : "$79"} vs
                      monthly!
                    </p>
                  )}
                  {!tier.priceYearly && isAnnual && (
                    <p
                      className={`mt-1 min-h-[16px] text-xs text-gray-500 dark:text-gray-400`}
                    >
                      {/* Placeholder for consistent height when Free plan is shown with annual toggle */}
                    </p>
                  )}
                </div>

                <p className="mb-6 min-h-[40px] text-center text-sm text-gray-600 dark:text-gray-400">
                  {tier.description}
                </p>

                <ul role="list" className="mb-8 flex-grow space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-start">
                      <div className="flex-shrink-0">
                        <FontAwesomeIcon
                          icon={faCheck}
                          className={`h-5 w-5 text-green-500 dark:text-green-400`}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        {feature.text}
                      </p>
                    </li>
                  ))}
                </ul>

                {tier.trialText && (
                  <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    {tier.trialText}
                  </p>
                )}

                <div
                 onClick={() => {
                   if (tier.title.toLowerCase().includes("free")) {
                     toast.info("Free plan is available after signup");
                     return;
                   }
                   const planParam = tier.title.toLowerCase().includes("plus") ? "plus" : "premium";
                   handleSubscribe(planParam);
                 }}
                  className={`mt-auto block w-full cursor-pointer rounded-lg px-6 py-3 text-center text-base font-medium shadow-md transition-transform duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    tier.highlight
                      ? "transform bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus-visible:ring-purple-500 group-hover:scale-105"
                      : "border border-purple-500 bg-white/70 text-purple-600 hover:bg-purple-50 focus-visible:ring-purple-500 dark:border-purple-400 dark:bg-slate-800/70 dark:text-purple-400 dark:hover:bg-slate-700/70"
                  } `}
                >
                  {tier.actionText}
                </div>

                {tier.audienceText && (
                  <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    {tier.audienceText}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-16 rounded-2xl border border-white/20 bg-slate-100/50 p-8 text-center shadow-lg backdrop-blur-md md:mt-24 dark:border-slate-700/50 dark:bg-slate-800/50"
          variants={prefersReducedMotion ? undefined : cardVariants}
        >
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Not Sure Which Plan is Right for You?
          </h3>
          <p className="mx-auto mb-5 max-w-lg text-gray-700 dark:text-gray-300">
            Start with our Free plan to explore core features, or dive deeper
            with a Plus trial. You can always upgrade as your financial needs
            grow.
          </p>
          <a
            href="mailto:hello@moneko.io"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-purple-600 transition-colors duration-200 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Contact Us for a Recommendation{" "}
            <FontAwesomeIcon icon={faRocket} className="ml-2" />
          </a>
        </motion.div>
      </motion.div>
     {isLoading&& <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>}
    </AmbientHaloLayout>
  );
}
