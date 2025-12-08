"use client";

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app-link/reset-password")({
  component: AppLinkResetPassword,
});

export function AppLinkResetPassword() {
  const [deepLink, setDeepLink] = useState<string | null>(null);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams.toString();
      const target = "moneko://reset-password";
      const builtDeepLink = params ? `${target}?${params}` : target;

      console.log("[AppLink] Redirecting to app deep link", {
        href: window.location.href,
        deepLink: builtDeepLink,
      });

      setDeepLink(builtDeepLink);

      // Attempt automatic redirect to the app
      window.location.href = builtDeepLink;
    } catch (error) {
      console.error("[AppLink] Failed to build app deep link", error);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-3 text-gray-900">
          Open in Moneko App
        </h1>
        <p className="text-gray-600 mb-4">
          We&apos;re redirecting you to the Moneko mobile app to complete your
          password reset.
        </p>
        <p className="text-gray-600 mb-6">
          If the app doesn&apos;t open automatically, tap the button below.
        </p>
        {deepLink && (
          <a
            href={deepLink}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Open Moneko App
          </a>
        )}
      </div>
    </div>
  );
}
