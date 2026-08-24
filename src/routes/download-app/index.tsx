import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/external-links";

const fallbackUrl = "/";

export const Route = createFileRoute("/download-app/")({
  component: AppLinkPage,
  head: () => ({
    meta: [
      { title: "Get Moneko" },
      {
        name: "description",
        content: "Download Moneko for iPhone or Android.",
      },
    ],
  }),
});

function AppLinkPage() {
  const [destination, setDestination] = useState(fallbackUrl);

  useEffect(() => {
    const nextDestination = getDownloadDestination(navigator);
    setDestination(nextDestination);

    const redirectTimer = window.setTimeout(() => {
      window.location.replace(nextDestination);
    }, 300);

    return () => window.clearTimeout(redirectTimer);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-950 dark:bg-[#0b0b0e] dark:text-slate-50">
      <section className="w-full max-w-sm text-center">
        <img
          src="/logo192.webp"
          alt="Moneko"
          width={64}
          height={64}
          className="mx-auto rounded-2xl shadow-sm"
        />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Opening Moneko
        </h1>
        <p className="mt-3 text-base leading-6 text-slate-600 dark:text-slate-300">
          Taking you to the best place to download the app.
        </p>
        <div
          className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600 motion-reduce:animate-none dark:border-slate-700 dark:border-t-violet-400"
          aria-hidden="true"
        />
        <p className="mt-8 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Not redirected?{" "}
          <a
            href={destination}
            className="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-4 transition-colors hover:text-violet-900 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Click here to continue.
          </a>
        </p>
        <p className="sr-only" aria-live="polite">
          Redirecting to the download page.
        </p>
      </section>
    </main>
  );
}

function getDownloadDestination(navigator: Navigator) {
  const userAgent = navigator.userAgent;
  const isAppleMobile =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isAppleMobile) return APP_STORE_URL;
  if (/Android/i.test(userAgent)) return PLAY_STORE_URL;
  return fallbackUrl;
}
