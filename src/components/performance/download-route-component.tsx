"use client";

import { Link } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { RetroBeeperSection } from "@/components/download/retro-beeper-section";
import FAQSection, { FAQItem } from "@/components/homepage/new/faq-section";

const META_TITLE = "Download Moneko - iOS & Android";
const META_DESCRIPTION = "Download Moneko on your iPhone or Android device. Experience the future of AI budgeting with seamless sync across all your devices.";
const META_KEYWORDS =
  "download moneko, moneko app, budgeting app ios, budgeting app android, expense tracker app, digital envelope budgeting app, couples budgeting app, whatsapp expense tracker";

const downloadFaqItems: FAQItem[] = [
  {
    id: "download-platforms",
    question: "Is Moneko available on iPhone and Android?",
    answer: "Yes. You can download Moneko for iOS or Android from the links on this page.",
  },
  {
    id: "download-what-next",
    question: "What can I do after I download Moneko?",
    answer: "You can track expenses, organize budgets with the Pockets system, and manage shared spending with Household Mode.",
  },
  {
    id: "download-household",
    question: "Does Moneko support shared budgets for couples or households?",
    answer: "Yes. Moneko includes Household Mode for shared bills and joint expense tracking.",
  },
];


export function DownloadRouteComponent() {
  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <link rel="canonical" href={getCanonicalUrl("/download")} />
      </Helmet>

      {/* Background Decor - Subtle Technical Grid (Consistent with How It Works) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <HomeHeader />

      <main className="relative z-10 pt-32 px-4 md:px-6 max-w-[1200px] mx-auto pb-24">

        {/* Retro Beeper Section (Hero) */}
        <RetroBeeperSection />

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Download the Moneko budgeting app</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Moneko is a modern expense tracker and budgeting app designed for everyday use on iPhone and Android.
                Use it to organize spending into purposeful categories, stay on top of bills, and make smarter decisions with AI-powered insights.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                 <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                   </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Pockets System</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-1">
                  Plan and allocate money using a digital envelope system that makes spending limits easy to see.
                </p>
                <Link to="/features/pockets-system" className="inline-flex items-center text-sm font-medium text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer group">
                  Learn more <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </Link>
              </div>

              <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                  <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                   </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Household Mode</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-1">
                  A joint expense tracker for couples and households—track shared bills without losing personal privacy.
                </p>
                <Link to="/features/household-mode" className="inline-flex items-center text-sm font-medium text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer group">
                  How it works <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </Link>
              </div>

              <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col text-left">
                  <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                   </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">AI Insights</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-1">
                  Ask questions about your money, spot trends, and plan ahead with scenario-based insights.
                </p>
                <Link to="/features/ai-insights" className="inline-flex items-center text-sm font-medium text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer group">
                  Explore Insights <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>

            <div className="mt-14 pt-10 border-t border-slate-100 dark:border-slate-800">
               <FAQSection
                items={downloadFaqItems}
                eyebrowText="Download FAQ"
                title="Common questions before you install"
                subtitle="Quick answers about downloading Moneko for iOS and Android."
                sectionClassName="min-h-0 px-0 py-0"
              />
            </div>           
        
          </div>
        </section>

        {/* Final CTA (Centered bottom section) */}
        <section className="container px-4 py-24 mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready to take control?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
               Download Moneko today and experience the clarity of money management done right.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton className="h-[52px]" />
              <AndroidDownloadButton className="h-[52px]" />
            </div>
             <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 
                    Private by Default
                </span>
                <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                    Secure Encryption
                </span>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

