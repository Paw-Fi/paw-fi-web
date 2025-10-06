"use client";
import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-moneko-background flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-xl rounded-3xl p-8 shadow-sm">
        <CardContent className="p-0 text-center space-y-4">
          {status === "working" && (
            <div className="space-y-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-medium text-foreground">Updating your preferences9</h1>
              <p className="text-muted-foreground">Please wait while we unsubscribe you.</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-2">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <h1 className="text-2xl font-medium text-foreground">You're unsubscribed</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "error" && (
            <Alert variant="default" className="mx-auto text-left">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <AlertTitle className="text-foreground">We couldn't process that</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {message || "Please try again later."}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Unsubscribe;
