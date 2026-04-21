"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { CheckCircle2, Smartphone, Gift, Zap, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export const Route = createFileRoute("/get-started/")({
  component: GetStarted,
  head: () => {
    const pageUrl = getCanonicalUrl("/get-started");
    const meta = seo({
      title: "Download Moneko App - Start Your Free Trial",
      description:
        "Your 7-day free trial is ready! Download the Moneko app on iOS or Android to start tracking expenses and managing your budget.",
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

function GetStarted() {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasTrial, setHasTrial] = useState(false);

  useEffect(() => {
    const checkSessionAndTrial = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // Not logged in, redirect to login
          window.location.href = "/login";
          return;
        }

        // Check if user has a trial subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, trial_end")
          .eq("user_id", sessionData.session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const hasActiveTrial =
          subscription?.status === "trialing" &&
          subscription?.trial_end &&
          new Date(subscription.trial_end) > new Date();

        setHasTrial(hasActiveTrial);
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSessionAndTrial();
  }, [navigate]);

  if (isCheckingSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-white dark:bg-[#050505]">
        <FontAwesomeIcon
          icon={faSpinner}
          className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans selection:bg-gray-100 dark:bg-[#050505] dark:selection:bg-gray-800">
      {/* Background Decor - Subtle Technical Grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:40px_40px]" />
      </div>

      <HomeHeader />

      <main className="relative z-10 mx-auto max-w-[1200px] px-4 pt-32 pb-24 md:px-6">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl dark:text-white">
            Your Free Trial is Ready!
          </h1>

          <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {hasTrial
              ? "You now have 7 days of full access to Moneko Plus. Download the app to start tracking expenses and managing your budget."
              : "Your account is ready. Download the app to start tracking expenses and managing your budget."}
          </p>

          {/* Download Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton className="h-[52px]" />
            <AndroidDownloadButton className="h-[52px]" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Private by Default
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Instant Sync
            </span>
          </div>
        </section>

        <MobileAppPreviewCarousel
          className="px-0 py-12"
          title="Open Moneko and start with the workflows people actually use"
          description="Preview voice logging, AI review, shared budgets, and WhatsApp capture before you jump into the app."
        />

        {/* Features Section */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">
              Why use the mobile app?
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Track Expenses on the Go
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Log spending instantly with voice notes, receipt scanning, and
                  quick-add widgets.
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.5 19c0-1.7-1.3-3-3-3c-1.1 0-2.1.6-2.6 1.5c-.5-.9-1.5-1.5-2.6-1.5c-1.7 0-3 1.3-3 3" />
                    <path d="M22 12h-6l-2-4l-4 8l-2-4H2" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  WhatsApp & Telegram
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Chat with Moneko AI directly in your favorite messaging apps
                  for effortless tracking.
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Siri Shortcuts
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  "Hey Siri, log my coffee expense" — hands-free expense
                  tracking on iOS.
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Real-time Notifications
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Get instant alerts for budget limits, bill reminders, and
                  spending insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready to start budgeting in Moneko?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Download Moneko to track expenses, review captured entries, and keep
            your budget current.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton className="h-[52px]" />
            <AndroidDownloadButton className="h-[52px]" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default GetStarted;
