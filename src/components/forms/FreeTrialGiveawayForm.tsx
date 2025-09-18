"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import { type EarlyAccessClaim } from "@/lib/early-access";
import { useRemainingSpots, useClaimEarlyAccess, useUserHasClaimed } from "@/hooks/use-early-access";
import { CustomSelect } from "@/components/ui/custom-select";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { useCookie } from "@/utils/use-cookie";
import { useAuth } from "@/contexts/auth-context";
import { Link, useNavigate } from "@tanstack/react-router";
import classNames from "classnames";


export function FreeTrialGiveawayForm() {
  const { getCookie, setCookie } = useCookie();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasClaimed, setHasClaimed] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    referralSource: "",
    experienceLevel: "",
    financialGoals: [] as string[],
    interestedFeatures: [] as string[],
  });
  const [result, setResult] = useState<{ 
    success?: boolean; 
    message?: string; 
    error?: string 
  }>({});

  // Use TanStack Query hooks
  const { data: remainingSpots = 98, isLoading: spotsLoading } = useRemainingSpots();
  const { data: userHasClaimedFromDB = false, isLoading: claimStatusLoading } = useUserHasClaimed(user?.id);
  const claimMutation = useClaimEarlyAccess();

  const experienceOptions = [
    { value: "never-invested", label: "I've never invested before" },
    { value: "dabbled", label: "I've dabbled a little (e.g. ETFs, stocks)" },
    { value: "active", label: "I actively manage my investments" },
    { value: "robo-advisor", label: "I use a robo-advisor" },
    { value: "other", label: "Other" },
  ];

  const financialGoalOptions = [
    { id: "emergency-fund", label: "Save for an emergency fund" },
    { id: "investing-retirement", label: "Start investing for retirement" },
    { id: "budget-money", label: "Learn how to budget/manage money" },
    { id: "pay-debt", label: "Pay off debt" },
    { id: "build-wealth", label: "Build wealth long-term" },
    { id: "other-goal", label: "Other" },
  ];

  const featureOptions = [
    { id: "ai-investing-chat", label: "AI-powered investing chat" },
    { id: "personalized-lessons", label: "Personalized financial lessons" },
    { id: "portfolio-tracker", label: "Portfolio tracker" },
    { id: "goal-calculators", label: "Goal-based calculators" },
    { id: "community-access", label: "Community access" },
    { id: "advisor-support", label: "1-on-1 advisor support (coming soon)" },
  ];

  const referralOptions = [
    { value: "search", label: "Search Engine (Google, Bing, etc.)" },
    { value: "social", label: "Social Media (TikTok, Instagram, etc.)" },
    { value: "friend", label: "Friend or family recommendation" },
    { value: "blog", label: "Blog or news article" },
    { value: "youtube", label: "YouTube" },
    { value: "podcast", label: "Podcast" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    // Auto-fill form with user data when authenticated
    if (isAuthenticated && user) {
      const fullName = user.user_metadata?.full_name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
      }));
    }
  }, [isAuthenticated, user]);

  // Separate useEffect for claim status checking
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use database check as primary source of truth
      if (!claimStatusLoading) {
        setHasClaimed(userHasClaimedFromDB);
      }
    } else {
      // Fallback to email-based cookie for non-authenticated users
      const claimed = getCookie("early-access-claimed");
      setHasClaimed(!!claimed);
    }
  }, [isAuthenticated, user, userHasClaimedFromDB, claimStatusLoading, getCookie]);


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (
    value: string, 
    field: 'financialGoals' | 'interestedFeatures', 
  ) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      let newArray;
      
      if (currentArray.includes(value)) {
        newArray = currentArray.filter((item) => item !== value);
      }else {
        newArray = [...currentArray, value];      }
      
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult({});

    // Require authentication before claiming
    if (!isAuthenticated || !user) {
      setResult({
        success: false,
        error: 'Please sign in to claim your early access spot.'
      });
      return;
    }

    const claim: EarlyAccessClaim = {
      email: formData.email,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      referralSource: formData.referralSource || undefined,
      experienceLevel: formData.experienceLevel || undefined,
      financialGoals: formData.financialGoals.length > 0 ? formData.financialGoals : undefined,
      interestedFeatures: formData.interestedFeatures.length > 0 ? formData.interestedFeatures : undefined,
      userId: user.id, // Add user ID to the claim
      // For backward compatibility, combine all interests
      interests: [
        formData.experienceLevel,
        ...formData.financialGoals,
        ...formData.interestedFeatures,
      ].filter(Boolean),
    };

    claimMutation.mutate(claim, {
      onSuccess: (response) => {
        if (response.success) {
          setResult({
            success: true,
            message: "🎉 Congratulations! Your free trial membership has been claimed successfully. Check your email for next steps!"
          });
          
          // No need to set cookie anymore - database check will handle this
          // The hook will automatically update when the mutation succeeds
          setHasClaimed(true);
          
          // Clear form data
          setFormData({
            email: "",
            firstName: "",
            lastName: "",
            referralSource: "",
            experienceLevel: "",
            financialGoals: [],
            interestedFeatures: [],
          });
        } else {
          setResult(response);
        }
      },
      onError: () => {
        setResult({
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        });
      }
    });
  };


  // Show loading state while checking claim status for authenticated users
  if (isAuthenticated && claimStatusLoading) {
    return (
      <div className="rounded-3xl bg-white/20 dark:bg-slate-800/20 p-12 backdrop-blur-2xl">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-300/30 dark:border-slate-600/30 mx-auto"></div>
          </div>
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">
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
      <div className="rounded-3xl bg-white/20 dark:bg-slate-800/20 p-12 backdrop-blur-2xl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
            Sign In Required
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Please sign in to claim your early access spot and join our exclusive community.
          </p>
          <div className="space-y-4">
            <motion.button
              onClick={() => navigate({ to: "/login", search: { redirect: "/early-access" } })}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#7458FF] hover:bg-[#836DFF] px-8 py-4 text-base font-medium text-white transition-all duration-200 ease-in-out"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Sign In
<ArrowRight className="ml-2 w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => navigate({ to: "/register", search: { redirect: "/early-access" } })}
              className="w-full inline-flex items-center justify-center rounded-xl border-2 border-[#7458FF] hover:bg-[#7458FF]/10 px-8 py-4 text-base font-medium text-[#7458FF] transition-all duration-200 ease-in-out"
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

      <div id="freetrial-form" className={classNames("flex flex-col",
        {
"rounded-3xl bg-white/20 dark:bg-slate-800/20 p-12 backdrop-blur-2xl":!hasClaimed        }
      )}>
        <form
          onSubmit={handleSubmit}
        >
          {/* Form status messages */}
          {result.error && (
            <div className="mb-6 rounded-2xl bg-red-100/20 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
              {result.error}
            </div>
          )}
       

            <>
            {!hasClaimed&&<>
              {/* Name fields */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 text-start"
                  >
                    Full Name <span className="text-[#7458FF]">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    disabled={isAuthenticated}
                    className={`w-full rounded-xl p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-[#7458FF]/30 border border-slate-200 dark:border-slate-700 ${
                      isAuthenticated 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400'
                    }`}
                    placeholder={isAuthenticated ? "" : "your full name"}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 text-start"
                  >
                    Email Address <span className="text-[#7458FF]">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isAuthenticated}
                    className={`w-full rounded-xl p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-[#7458FF]/30 border border-slate-200 dark:border-slate-700 ${
                      isAuthenticated 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400'
                    }`}
                    placeholder={isAuthenticated ? "" : "you@example.com"}
                  />
                </div>
              </div>

              {/* Experience Level */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">
                  What's your current level of investing experience?
                </label>
                <CustomSelect
                  options={experienceOptions}
                  value={formData.experienceLevel}
                  onChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}
                  placeholder="Select your experience level"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#7458FF]/30 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Financial Goals */}
              <div className="mb-6">
                <MultiSelectDropdown
                  options={financialGoalOptions}
                  selectedValues={formData.financialGoals}
                  onChange={(value) => handleMultiSelectChange(value, 'financialGoals')}
                  placeholder="Select your financial goals"
                  label="What are your top financial goals right now?"
                  className="custom-form-field"
                />
              </div>

              {/* Interested Features */}
              <div className="mb-6">
                <MultiSelectDropdown
                  options={featureOptions}
                  selectedValues={formData.interestedFeatures}
                  onChange={(value) => handleMultiSelectChange(value, 'interestedFeatures')}
                  placeholder="Select features you're excited about"
                  label="Which Moneko features are you most excited about?"
                  className="custom-form-field"
                />
              </div>

              {/* Referral source */}
              <div className="mb-8">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">
                  How did you hear about us?
                </label>
                <CustomSelect
                  options={referralOptions}
                  value={formData.referralSource}
                  onChange={(value) => setFormData(prev => ({ ...prev, referralSource: value }))}
                  placeholder="Select how you found us"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#7458FF]/30 border border-slate-200 dark:border-slate-700"
                />
              </div>
              </>}

              {/* Submit button */}
              <div className="text-center">
                <motion.button
                  type="submit"
                  disabled={claimMutation.isPending || hasClaimed}
                  className="group inline-flex w-full items-center justify-center rounded-xl bg-[#7458FF] hover:bg-[#836DFF] disabled:bg-gray-400 px-8 py-4 text-lg font-medium text-white transition-all duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-70"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {claimMutation.isPending ? (
                    <>
                      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Claiming...
                    </>
                  ) : hasClaimed ? (
                    <>
                       Claimed Successfully
<CheckCircle className="ml-2 w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Claim Your Membership
        <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>

              {(result.success||hasClaimed)&&<motion.div
              className="mt-6"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <div className="text-center">
                <div className="rounded-2xl bg-green-100/20 dark:bg-green-900/20 p-6 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-center mb-3">
<Mail className="mr-3 text-green-600 dark:text-green-400 w-5 h-5" />
                    <span className="font-semibold text-green-700 dark:text-green-300">Check Your Inbox</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 leading-relaxed">
                    We've sent you the promo code in the email and can use it to checkout at the <Link to="/pricing" className="font-medium underline hover:text-green-500 dark:hover:text-green-300 transition-colors">pricing page</Link>.
                  </p>
                </div>
              </div>
            </motion.div>
              
              }
            </>
     

         
        </form>
      </div>
  );
}