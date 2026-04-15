"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { type CoupleBudgetingClaim } from "@/lib/couple-budgeting-waitlist";
import { useCoupleBudgetingUserClaimed } from "@/hooks/use-couple-budgeting-waitlist";
import { CustomSelect } from "@/components/ui/custom-select";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Input } from "@/components/ui/input";
import { useCookie } from "@/utils/use-cookie";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import classNames from "classnames";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { coupleBudgetingKeys } from "@/hooks/use-couple-budgeting-waitlist";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

const APPSTORE_URL = "https://apps.apple.com/app/moneko/id6753925279";

export type SelectOption = { value: string; label: string };
export type MultiOption = { id: string; label: string };

export type FreeTrialQuestions = {
  budgetingMethodOptions: SelectOption[];
  mobileAppPriorities: MultiOption[];
  mobileFeatureOptions: MultiOption[];
  referralOptions: SelectOption[];
};

export type FreeTrialGiveawayFormProps = {
  questions: FreeTrialQuestions;
  onSubmit: (
    claim: CoupleBudgetingClaim,
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  userHasClaimedFromDB: boolean;
  claimStatusLoading: boolean;
};

export function FreeTrialGiveawayForm({
  questions,
  onSubmit,
  userHasClaimedFromDB,
  claimStatusLoading,
}: FreeTrialGiveawayFormProps) {
  const { getCookie, setCookie } = useCookie();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    referralSource: "",
    budgetingMethod: "",
    mobileAppPriorities: [] as string[],
    interestedMobileFeatures: [] as string[],
    devicePreference: "",
  });
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  }>({});
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Helper to auto-detect device type from the browser
  function detectDeviceType(): "ios" | "android" | "desktop" {
    if (typeof window === "undefined") return "desktop";
    const ua =
      navigator.userAgent ||
      (navigator as any).vendor ||
      (window as any).opera ||
      "";
    const isAndroid = /android/i.test(ua);
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports MacIntel with touch points
      ((navigator.platform === "MacIntel" ||
        (navigator as any).userAgentData?.platform === "macOS") &&
        (navigator as any).maxTouchPoints > 1);
    if (isIOS) return "ios";
    if (isAndroid) return "android";
    return "desktop";
  }

  // CRITICAL FIX: Reset state on mount and invalidate cache to prevent stale data
  // This fixes the issue where success message shows even when user hasn't claimed
  useEffect(() => {
    // Reset hasClaimed to false to prevent stale state from previous navigations
    setHasClaimed(false);

    // Force invalidate the query cache to ensure fresh data from database
    // This prevents React Query from returning stale cached data
    if (user?.id) {
      queryClient.invalidateQueries({
        queryKey: coupleBudgetingKeys.userClaimed(user.id),
      });
    }
  }, []); // Empty deps = runs once on mount

  useEffect(() => {
    // Auto-fill form with user data when authenticated
    if (isAuthenticated && user) {
      const fullName = user.user_metadata?.full_name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setFormData((prev) => ({
        ...prev,
        email: user.email || "",
        firstName: firstName,
        lastName: lastName,
      }));
    }
  }, [isAuthenticated, user]);

  // Auto-detect device preference (no UI)
  useEffect(() => {
    const detected = detectDeviceType();
    setFormData((prev) => ({ ...prev, devicePreference: detected }));
  }, []);

  // Invalidate cache when user becomes available (e.g., after OAuth redirect)
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({
        queryKey: coupleBudgetingKeys.userClaimed(user.id),
      });
    }
  }, [user?.id]); // Runs when user ID changes

  // Separate useEffect for claim status checking
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use database check as primary source of truth
      if (!claimStatusLoading) {
        setHasClaimed(userHasClaimedFromDB);
      }
    } else {
      // Fallback to email-based cookie for non-authenticated users
      // SECURITY NOTE: Cookie is only used when user is not authenticated
      // Once authenticated, database is the source of truth
      const claimed = getCookie("early-access-claimed");
      setHasClaimed(!!claimed);
    }
  }, [isAuthenticated, user, userHasClaimedFromDB, claimStatusLoading]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Handle full name input by splitting into firstName and lastName
    if (name === "fullName") {
      const nameParts = value.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setFormData((prev) => ({
        ...prev,
        firstName: firstName,
        lastName: lastName,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelectChange = (
    value: string,
    field: "mobileAppPriorities" | "interestedMobileFeatures",
  ) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      let newArray;

      if (currentArray.includes(value)) {
        newArray = currentArray.filter((item) => item !== value);
      } else {
        newArray = [...currentArray, value];
      }

      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult({});
    if (hasClaimed) {
      window.location.href = APPSTORE_URL;
      return;
    }

    // Require authentication before claiming
    if (!isAuthenticated || !user) {
      setResult({
        success: false,
        error: "Please sign in to continue.",
      });
      return;
    }

    const detectedDevice = formData.devicePreference || detectDeviceType();
    const claim: CoupleBudgetingClaim = {
      email: formData.email,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      referralSource: formData.referralSource || undefined,
      budgetingMethod: formData.budgetingMethod || undefined,
      mobileAppPriorities:
        formData.mobileAppPriorities.length > 0
          ? formData.mobileAppPriorities
          : undefined,
      interestedMobileFeatures:
        formData.interestedMobileFeatures.length > 0
          ? formData.interestedMobileFeatures
          : undefined,
      devicePreference: detectedDevice,
      userId: user.id,
    };

    try {
      setIsSubmitting(true);
      const response = await onSubmit(claim);
      if (response.success) {
        setResult({
          success: true,
          message: "Thanks! Redirecting you to the App Store.",
        });
        setHasClaimed(true);
        setFormData({
          email: "",
          firstName: "",
          lastName: "",
          referralSource: "",
          budgetingMethod: "",
          mobileAppPriorities: [],
          interestedMobileFeatures: [],
          devicePreference: "",
        });
        window.location.href = APPSTORE_URL;
      } else {
        setResult(response);
      }
    } catch (err) {
      setResult({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fallback timeout effect: if loading takes more than 5 seconds, show the form anyway
  useEffect(() => {
    if (isAuthenticated && claimStatusLoading) {
      // Set a 5 second timeout
      const timer = setTimeout(() => {
        console.warn("Claim status check timed out, showing form anyway");
        setLoadingTimeout(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Reset timeout when not loading
      setLoadingTimeout(false);
    }
  }, [isAuthenticated, claimStatusLoading]);

  // Only show loading if we haven't timed out yet
  if (isAuthenticated && claimStatusLoading && !loadingTimeout) {
    return (
      <div className="rounded-3xl bg-white/20 p-12 backdrop-blur-2xl dark:bg-slate-800/20">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-300/30 dark:border-slate-600/30"></div>
          </div>
          <h3 className="mb-3 text-xl font-medium text-slate-800 dark:text-slate-200">
            Checking your status...
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Please wait while we verify your claim status.
          </p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl bg-white/20 backdrop-blur-2xl dark:bg-slate-800/20">
        <div className="text-center">
          <h3 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-200">
            Download Moneko
          </h3>
          <p className="mb-8 leading-relaxed text-slate-600 dark:text-slate-400">
            Sign in to continue. Your account keeps your budgets synced across
            devices.
          </p>
          <div className="space-y-4">
            <motion.button
              onClick={() =>
                navigate({
                  to: "/login",
                  search: { redirect: "/download" },
                })
              }
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#7458FF] px-8 py-4 text-base font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#836DFF]"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() =>
                navigate({
                  to: "/register",
                  search: { redirect: "/download" },
                })
              }
              className="inline-flex w-full items-center justify-center rounded-xl border-2 border-[#7458FF] px-8 py-4 text-base font-medium text-[#7458FF] transition-all duration-200 ease-in-out hover:bg-[#7458FF]/10"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Create Account
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="freetrial-form"
      className={classNames("flex flex-col", {
        "rounded-3xl bg-white/20 backdrop-blur-2xl dark:bg-slate-800/20":
          !hasClaimed,
      })}
    >
      <form onSubmit={handleSubmit}>
        {/* Form status messages */}
        {result.error && (
          <div className="mb-6 rounded-2xl bg-red-100/20 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {result.error}
          </div>
        )}

        <>
          {!hasClaimed && (
            <>
              {/* Name fields */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-start text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Full Name <span className="text-[#7458FF]">*</span>
                  </label>
                  <Input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={`${formData.firstName} ${formData.lastName}`.trim()}
                    onChange={handleInputChange}
                    required
                    disabled={isAuthenticated}
                    placeholder={isAuthenticated ? "" : "your full name"}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-start text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Email Address <span className="text-[#7458FF]">*</span>
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isAuthenticated}
                    placeholder={isAuthenticated ? "" : "you@example.com"}
                  />
                </div>
              </div>

              {/* Budgeting Method */}
              <div className="mb-6">
                <label className="mb-2 block text-start text-sm font-medium text-slate-700 dark:text-slate-300">
                  How do you currently manage your budget?
                </label>
                <CustomSelect
                  options={questions.budgetingMethodOptions}
                  value={formData.budgetingMethod}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, budgetingMethod: value }))
                  }
                  placeholder="Select your current method"
                />
              </div>

              {/* Mobile App Priorities */}
              <div className="mb-6">
                <MultiSelectDropdown
                  options={questions.mobileAppPriorities}
                  selectedValues={formData.mobileAppPriorities}
                  onChange={(value) =>
                    handleMultiSelectChange(value, "mobileAppPriorities")
                  }
                  placeholder="Select your mobile app priorities"
                  label="What mobile budgeting features are most important to you?"
                />
              </div>

              {/* Interested Mobile Features */}
              <div className="mb-6">
                <MultiSelectDropdown
                  options={questions.mobileFeatureOptions}
                  selectedValues={formData.interestedMobileFeatures}
                  onChange={(value) =>
                    handleMultiSelectChange(value, "interestedMobileFeatures")
                  }
                  placeholder="Select mobile features you want"
                  label="Which mobile app features are you most excited about?"
                />
              </div>

              {/* Device Preference: removed UI. Device is auto-detected and sent to backend. */}

              {/* Referral source */}
              <div className="mb-8">
                <label className="mb-2 block text-start text-sm font-medium text-slate-700 dark:text-slate-300">
                  How did you hear about us?
                </label>
                <CustomSelect
                  options={questions.referralOptions}
                  value={formData.referralSource}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, referralSource: value }))
                  }
                  placeholder="Select how you found us"
                />
              </div>
            </>
          )}

          {/* Submit button */}
          {!hasClaimed && (
            <div className="text-center">
              <motion.button
                type="submit"
                className="group sm:text-md inline-flex w-full items-center justify-center rounded-xl bg-[#7458FF] px-8 py-4 font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#836DFF] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 lg:text-lg"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : hasClaimed ? (
                  <>
                    Download on the App Store
                    <CheckCircle className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    Download on the App Store
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </motion.button>

              <div className="mt-6 flex w-full items-center justify-center gap-2 text-center">
                <DiscordLogoIcon className="h-6 w-6 text-slate-800 dark:text-slate-200" />
                <a
                  href="https://discord.gg/M2Dgujvtze"
                  target="_blank"
                  className="text-sm text-slate-800 dark:text-slate-200"
                >
                  Join Discord & save up to 50%!
                </a>
              </div>
            </div>
          )}

          {(result.success || hasClaimed) && (
            <motion.div
              className=""
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <div className="text-center">
                <div className="rounded-2xl border border-green-200 bg-green-100/20 p-6 dark:border-green-700 dark:bg-green-900/20">
                  <div className="mb-3 flex items-center justify-center">
                    <CheckCircle className="mr-3 h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      Thank you for joining!
                    </span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-green-600 dark:text-green-400">
                    Download the mobile app:
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <AppleDownloadButton />
                    <AndroidDownloadButton />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      </form>
    </div>
  );
}
