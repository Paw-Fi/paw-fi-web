import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { supabase } from "@/lib/supabase";

type UnsubscribeStatus =
  | "idle"
  | "missingEmail"
  | "working"
  | "success"
  | "notFound"
  | "error";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email.trim() : "",
  }),
  component: Unsubscribe,
  head: () => {
    const pageUrl = getCanonicalUrl("/unsubscribe");
    const title = "Unsubscribe | Moneko";
    const description = "You have successfully unsubscribed from Moneko's newsletter.";
    const keywords = "unsubscribe, newsletter, Moneko";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function Unsubscribe() {
  const { email } = Route.useSearch();
  const [status, setStatus] = useState<UnsubscribeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const normalizedEmail = useMemo(() => {
    if (!email || typeof email !== "string") return "";
    return email.toLowerCase().trim();
  }, [email]);

  useEffect(() => {
    const run = async () => {
      if (!normalizedEmail) {
        setStatus("missingEmail");
        return;
      }

      setStatus("working");
      setErrorMessage("");

      const { data, error } = await supabase
        .from("users")
        .update({ unsubscribed_from_newsletter: true })
        .eq("email", normalizedEmail)
        .select("id")
        .order("id", { ascending: true })
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message ?? "Unknown error");
        setStatus("error");
        return;
      }

      if (!data) {
        setStatus("notFound");
        return;
      }

      setStatus("success");
    };

    void run();
  }, [normalizedEmail]);

  const titleByStatus: Record<Exclude<UnsubscribeStatus, "idle">, string> = {
    missingEmail: "Missing email",
    working: "Unsubscribing...",
    success: "You have been unsubscribed",
    notFound: "Email not found",
    error: "Something went wrong",
  };

  const descriptionByStatus: Record<Exclude<UnsubscribeStatus, "idle">, string> = {
    missingEmail: "Please use the unsubscribe link from your email so we can identify your address.",
    working: "We are processing your request...",
    success: "We have marked your email as opted out. You will no longer receive marketing emails.",
    notFound: "We could not find this email in our records. Please double-check the link or contact support.",
    error: errorMessage || "Unexpected error while processing your request.",
  };

  const renderContent = () => {
    const current = status === "idle" ? "working" : status; // treat idle as working during first render
    const title = titleByStatus[current as Exclude<UnsubscribeStatus, "idle">];
    const description = descriptionByStatus[current as Exclude<UnsubscribeStatus, "idle">];

    return (
      <div className="max-w-xl w-full rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-semibold">
            {current === "success" ? "✓" : current === "error" ? "!" : "i"}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            <p className="mt-2 text-sm text-neutral-600">{description}</p>
            {normalizedEmail && (
              <p className="mt-1 text-xs text-neutral-500">Email: {normalizedEmail}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-50 flex items-center justify-center px-4">
      {renderContent()}
    </div>
  );
}