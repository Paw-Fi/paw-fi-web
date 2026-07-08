import { createFileRoute } from "@tanstack/react-router";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/support");
    return {
      meta: seo({
        title: "Support | Moneko",
        description: "Need help? Contact the Moneko team for support and inquiries.",
        url: pageUrl,
      }),
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

function SupportPage() {
  return (
    <div className="relative flex pt-24 min-h-screen flex-col bg-background font-sans selection:bg-primary/20">
      <AmbientHalo />
      <HomeHeader />

      <main className="z-10 flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              How can we help?
            </h1>
            <p className="mx-auto max-w-lg text-lg text-slate-600 dark:text-slate-300">
              We're here to answer your questions and help you get the most out of Moneko.
            </p>
          </div>

          <a
            href="mailto:hello@moneko.io"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <Mail className="h-5 w-5" />
            Contact Support
          </a>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            or email us directly at{" "}
            <a 
              href="mailto:hello@moneko.io"
              className="font-medium text-slate-900 hover:text-primary dark:text-slate-200 dark:hover:text-primary transition-colors"
            >
              hello@moneko.io
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}