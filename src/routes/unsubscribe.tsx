"use client";
import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/unsubscribe")({
  component: Unsubscribe,
  head: () => {
    const pageUrl = getCanonicalUrl("/unsubscribe");
    const title = "Unsubscribe | Moneko";
    const description = "Manage your email preferences. Unsubscribe from Moneko's newsletter.";
    const keywords = "unsubscribe, newsletter, Moneko";
    const imageUrl = "https://moneko.io/og-img.png";

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function Unsubscribe() {
  const { email } = useSearch<{ email?: string }>();
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!email) {
        setStatus("error");
        setMessage("Invalid unsubscribe link. Missing email parameter.");
        return;
      }
      setStatus("working");
      try {
        const { data, error } = await supabase.functions.invoke("newsletter-unsubscribe", {
          method: "POST",
          body: { email },
        });
        if (error) throw new Error(error.message || "Failed to unsubscribe");
        setStatus("success");
        setMessage(data?.message || "You've been unsubscribed from our newsletter.");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Something went wrong while unsubscribing.");
      }
    };
    run();
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        {status === "working" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
            <h1 className="text-2xl font-semibold">Updating your preferences…</h1>
            <p className="text-gray-600 mt-2">Please wait while we unsubscribe you.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600">You're unsubscribed</h1>
            <p className="text-gray-600 mt-2">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="flex justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600">We couldn't process that</h1>
            <p className="text-gray-600 mt-2">{message || "Please try again later."}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default Unsubscribe;
