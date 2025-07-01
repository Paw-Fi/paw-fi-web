import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faSpinner,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { PlanOption, getPlanOptions } from "@/data/pricing-plans";

interface PlanSelectorProps {
  currentPlan: string;
  onChangePlan: (plan: string, billingInterval: string) => void;
  isLoading: boolean;
}

// Using PlanOption interface from shared pricing-plans.ts

export function PlanSelector({
  currentPlan,
  onChangePlan,
  isLoading,
}: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Get plan options from shared data module
  const plans: PlanOption[] = getPlanOptions();

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleChangePlan = () => {
    if (selectedPlan) {
      onChangePlan(selectedPlan, billingInterval);
    }
  };

  // Calculate savings percentage for yearly billing
  const calculateSavings = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const monthlyCost = monthly * 12;
    const savings = ((monthlyCost - yearly) / monthlyCost) * 100;
    return Math.round(savings);
  };

  return (
    <div className="space-y-6">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`relative inline-flex items-center rounded-l-md px-4 py-2 text-sm font-medium ${
              billingInterval === "monthly"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            } border border-gray-300 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={`relative -ml-px inline-flex items-center rounded-r-md px-4 py-2 text-sm font-medium ${
              billingInterval === "yearly"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            } border border-gray-300 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary`}
          >
            Yearly
            <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Save {calculateSavings(plans[1].monthlyPrice, plans[1].yearlyPrice / 12)}%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isSelected = selectedPlan === plan.id;
          const price =
            billingInterval === "monthly"
              ? plan.monthlyPrice
              : plan.yearlyPrice / 12;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 shadow-md backdrop-blur-xl transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-slate-50/60 dark:bg-slate-900/60 ring-2 ring-primary"
                  : plan.popular
                  ? "border-purple-200 bg-slate-50/60 dark:bg-slate-900/60"
                  : "border-gray-200 bg-slate-50/60 dark:bg-slate-900/60"
              } ${
                isCurrentPlan
                  ? "cursor-default"
                  : "cursor-pointer hover:border-primary hover:shadow-lg"
              }`}
              onClick={() => !isCurrentPlan && handleSelectPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-md">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              </div>

              <div className="mb-4">
                <p className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    ${price.toFixed(2)}
                  </span>
                  <span className="ml-1 text-sm text-gray-500">
                    /month
                  </span>
                </p>
                {billingInterval === "yearly" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Billed as ${plan.yearlyPrice.toFixed(2)} per year
                  </p>
                )}
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      className="mr-2 h-5 w-5 flex-shrink-0 text-green-500"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="rounded-md bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-800">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan(plan.id);
                  }}
                  className={`w-full rounded-md px-4 py-2 text-center text-sm font-medium ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      {selectedPlan && selectedPlan !== currentPlan && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleChangePlan}
            disabled={isLoading}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="mr-2 h-5 w-5 animate-spin"
                />
                Processing...
              </>
            ) : (
              <>
                {currentPlan === "free" || !currentPlan
                  ? "Upgrade to " + selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)
                  : "Change Plan"}
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="ml-2 h-5 w-5"
                />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
