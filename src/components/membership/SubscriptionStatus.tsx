import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrown,
  faCheckCircle,
  faExclamationCircle,
  faCalendarAlt,
  faInfoCircle,
  faSpinner,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";

interface SubscriptionStatusProps {
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null; // Null for lifetime plans
    cancel_at_period_end: boolean;
    days_until_next_payment: number | null;
  } | null;
  isLoading: boolean;
  error: any;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
  isMutating: boolean;
}

export function SubscriptionStatus({
  subscription,
  isLoading,
  error,
  onCancel,
  onResume,
  isMutating,
}: SubscriptionStatusProps) {
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get plan display name
  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case "free":
        return "Free";
      case "plus":
        return "Plus";
      case "premium":
        return "Premium";
      case "lifetime":
        return "Lifetime";
      default:
        return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      case "incomplete":
      case "incomplete_expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return faCheckCircle;
      case "trialing":
        return faInfoCircle;
      case "past_due":
        return faExclamationCircle;
      case "canceled":
        return faTimesCircle;
      case "incomplete":
      case "incomplete_expired":
        return faExclamationCircle;
      default:
        return faInfoCircle;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FontAwesomeIcon
          icon={faSpinner}
          className="mr-3 h-6 w-6 animate-spin text-primary"
        />
        <span className="text-gray-500">Loading subscription details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <FontAwesomeIcon
          icon={faExclamationCircle}
          className="mb-2 h-8 w-8 text-red-500"
        />
        <h3 className="text-lg font-medium text-red-800">
          Error Loading Subscription
        </h3>
        <p className="mt-2 text-sm text-red-700">
          We couldn't load your subscription details. Please try again later.
        </p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="mb-2 h-8 w-8 text-gray-400"
          />
          <h3 className="text-lg font-medium text-gray-900">
            No Active Subscription
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            You don't have an active subscription. Visit our pricing page to
            subscribe to a plan.
          </p>
          <div className="mt-4">
            <a
              href="/pricing"
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
              <FontAwesomeIcon
                icon={faCrown}
                className="h-6 w-6 text-white"
              />
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-gray-900">
                {getPlanDisplayName(subscription.plan)} Plan
              </h3>
              <div className="mt-1 flex items-center">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                    subscription.status
                  )}`}
                >
                  <FontAwesomeIcon
                    icon={getStatusIcon(subscription.status)}
                    className="mr-1 h-3 w-3"
                  />
                  {subscription.status.charAt(0).toUpperCase() +
                    subscription.status.slice(1).replace("_", " ")}
                </span>
                {subscription.cancel_at_period_end && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    Cancels at period end
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          {/* Don't show cancel button for lifetime plan */}
          {subscription.plan !== "lifetime" && subscription.status === "active" && !subscription.cancel_at_period_end && (
            <button
              onClick={onCancel}
              disabled={isMutating}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isMutating ? (
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Cancel Subscription
            </button>
          )}
          {/* Resume button only for recurring plans */}
          {subscription.plan !== "lifetime" && subscription.cancel_at_period_end && (
            <button
              onClick={onResume}
              disabled={isMutating}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isMutating ? (
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : null}
              Resume Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Details */}
      {subscription.plan === "lifetime" ? (
        /* Lifetime Plan: Show permanent access message */
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center">
            <FontAwesomeIcon
              icon={faCrown}
              className="mr-3 h-5 w-5 text-amber-600"
            />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Lifetime Access - Never Expires
              </p>
              <p className="text-sm text-amber-700">
                You have permanent access to all features with no recurring billing.
              </p>
            </div>
          </div>
        </div>
      ) : subscription.current_period_end ? (
        /* Recurring Plans: Show billing period */
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center">
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className="mr-3 h-5 w-5 text-gray-400"
            />
            <div>
              {subscription.cancel_at_period_end ? (
                <p className="text-sm text-gray-700">
                  Your subscription will end on{" "}
                  <span className="font-medium">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  Your next payment is on{" "}
                  <span className="font-medium">
                    {formatDate(subscription.current_period_end)}
                  </span>
                  {subscription.days_until_next_payment !== null && (
                    <span className="ml-1 text-gray-500">
                      ({subscription.days_until_next_payment} days from now)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
