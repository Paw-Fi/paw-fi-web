"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
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
      <div className="min-h-screen relative bg-white dark:bg-[#050505] flex items-center justify-center">
        <FontAwesomeIcon
          icon={faSpinner}
          className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <HomeHeader />

      <main className="relative z-10 pt-32 px-4 md:px-6 max-w-[1200px] mx-auto pb-24">
        {/* Hero Section */}
        <section className="text-center mb-16">
         

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Your Free Trial is Ready!
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
            {hasTrial
              ? "You now have 7 days of full access to Moneko Plus. Download the app to start tracking expenses and managing your budget."
              : "Your account is ready. Download the app to start tracking expenses and managing your budget."}
          </p>
        
          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <AppleDownloadButton className="h-[52px]" />
            <AndroidDownloadButton className="h-[52px]" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-slate-500 dark:text-slate-400 text-sm font-medium">
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

        {/* Features Section */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
              Why use the mobile app?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-900 dark:text-white shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Track Expenses on the Go
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Log spending instantly with voice notes, receipt scanning, and quick-add widgets.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-900 dark:text-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3c-1.1 0-2.1.6-2.6 1.5c-.5-.9-1.5-1.5-2.6-1.5c-1.7 0-3 1.3-3 3"/><path d="M22 12h-6l-2-4l-4 8l-2-4H2"/></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  WhatsApp & Telegram
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Chat with Moneko AI directly in your favorite messaging apps for effortless tracking.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-900 dark:text-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Siri Shortcuts
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  "Hey Siri, log my coffee expense" — hands-free expense tracking on iOS.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-900 dark:text-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Real-time Notifications
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Get instant alerts for budget limits, bill reminders, and spending insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container px-4 py-16 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">
            Ready to take control?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
            Download Moneko today and experience the clarity of money management done right.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
