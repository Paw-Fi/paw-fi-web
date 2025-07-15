import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faCheckCircle,
  faTimesCircle,
  faExclamationCircle,
  faSpinner,
  faArrowRight,
  faCalendarAlt,
  faMoneyBillWave,
  faHistory,
  faExchangeAlt,
  faTimes,
  faRedo,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/use-subscription";
import { InvoiceHistory } from "./InvoiceHistory";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { PlanSelector } from "./PlanSelector";
import { SubscriptionDetails } from "./SubscriptionDetails";


export function MembershipDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "payment" | "plan" | "history">("details");
  const { 
    subscription, 
    features, 
    paymentMethod, 
    invoices, 
    isLoading, 
    error,
    cancelSubscription,
    resumeSubscription,
    changePlan,
    isMutating
  } = useSubscription(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faSpinner}
            className="mb-4 h-8 w-8 animate-spin text-primary"
          />
          <h3 className="text-lg font-medium text-gray-900">
            Loading subscription details...
          </h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 py-6">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faExclamationCircle}
            className="mb-4 h-8 w-8 text-red-500"
          />
          <h3 className="text-lg font-medium text-gray-900">
            Error loading subscription details
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please try again later or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 px-4 py-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Membership</h1>
        <p className="text-gray-600">
          Manage your subscription, payment methods, and billing history.
        </p>
      </div>

      {/* Subscription Status Card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Current Subscription
            </h2>
            <div className="mt-1 flex items-center">
              <span
                className={`mr-2 inline-flex h-2.5 w-2.5 rounded-full ${
                  subscription?.status === "active"
                    ? "bg-green-500"
                    : subscription?.status === "trialing"
                    ? "bg-blue-500"
                    : subscription?.status === "canceled" || subscription?.status === "none"
                    ? "bg-gray-400"
                    : "bg-yellow-500"
                }`}
              ></span>
              <p className="text-sm font-medium capitalize text-gray-700">
                {/* Show the correct subscription plan and status */}
                {subscription ? (
                  <>
                    {subscription.plan || "Free"}{" "}
                    {subscription.status && subscription.status !== "none" && `(${subscription.status})`}
                  </>
                ) : (
                  "Free (None)"
                )}
              </p>
            </div>
          </div>

          {subscription?.status === "active" && !subscription?.cancel_at_period_end && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {subscription?.days_until_next_payment !== null
                  ? `Renews in ${subscription?.days_until_next_payment} days`
                  : ""}
              </span>
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="h-4 w-4 text-gray-400"
              />
            </div>
          )}

          {subscription?.status === "active" && subscription?.cancel_at_period_end && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Expires on{" "}
                {new Date(subscription?.current_period_end).toLocaleDateString()}
              </span>
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="h-4 w-4 text-gray-400"
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* {subscription?.status === "active" && !subscription?.cancel_at_period_end && (
            <button
              onClick={() => cancelSubscription()}
              disabled={isMutating}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isMutating ? (
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <FontAwesomeIcon icon={faTimes} className="mr-2 h-4 w-4" />
              )}
              Cancel Subscription
            </button>
          )} */}

          {subscription?.status === "active" && subscription?.cancel_at_period_end && (
            <button
              onClick={() => resumeSubscription()}
              disabled={isMutating}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isMutating ? (
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" />
              )}
              Resume Subscription
            </button>
          )}

          {(subscription?.status === "none" || 
            subscription?.status === "canceled") && (
            <button
              onClick={() => setActiveTab("plan")}
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <FontAwesomeIcon
                icon={faArrowRight}
                className="mr-2 h-4 w-4"
              />
              Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Subscription Details
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "payment"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "plan"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Change Plan
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Billing History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "details" && (
          <SubscriptionDetails 
            subscription={subscription} 
            features={features} 
          />
        )}
        {activeTab === "payment" && (
          <PaymentMethodManager 
            paymentMethod={paymentMethod} 
            customerId={subscription?.stripe_customer_id} 
            userId={user?.id}
          />
        )}
        {activeTab === "plan" && (
          <PlanSelector 
            currentPlan={subscription?.plan || "free"} 
            onChangePlan={changePlan}
            isLoading={isMutating}
          />
        )}
        {activeTab === "history" && (
          <InvoiceHistory invoices={invoices || []} />
        )}
      </div>
    </div>
  );
}
