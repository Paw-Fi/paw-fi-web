import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faCalendarAlt,
  faInfoCircle,
  faCreditCard,
  faReceipt,
  faClock,
} from "@fortawesome/free-solid-svg-icons";

interface SubscriptionDetailsProps {
  subscription: {
    id: string;
    plan: string;
    status: string;
    current_period_end: string;
    next_payment_date: string | null;
    cancel_at_period_end: boolean;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    created_at: string;
    updated_at: string;
    days_until_next_payment: number | null;
  } | null;
  features: Array<{
    feature: string;
    included: boolean;
    limit_value: number | null;
  }>;
}

export function SubscriptionDetails({
  subscription,
  features,
}: SubscriptionDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">
          Subscription Details
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Plan</h4>
            <p className="mt-1 text-sm font-medium capitalize text-gray-900">
              {subscription?.plan || "Free"}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">Status</h4>
            <p className="mt-1 flex items-center text-sm font-medium text-gray-900">
              <span
                className={`mr-2 inline-flex h-2 w-2 rounded-full ${
                  subscription?.status === "active"
                    ? "bg-green-500"
                    : subscription?.status === "trialing"
                    ? "bg-blue-500"
                    : subscription?.status === "canceled" || subscription?.status === "none"
                    ? "bg-gray-400"
                    : "bg-yellow-500"
                }`}
              ></span>
              <span className="capitalize">{subscription?.status || "None"}</span>
            </p>
          </div>

          {subscription?.status !== "none" && subscription?.status && (
            <>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Current Period Ends
                </h4>
                <p className="mt-1 flex items-center text-sm text-gray-900">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="mr-1.5 h-4 w-4 text-gray-400"
                  />
                  {subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : "N/A"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Auto-Renew
                </h4>
                <p className="mt-1 flex items-center text-sm text-gray-900">
                  {subscription?.cancel_at_period_end ? (
                    <>
                      <FontAwesomeIcon
                        icon={faTimesCircle}
                        className="mr-1.5 h-4 w-4 text-red-500"
                      />
                      No - Will expire at end of period
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="mr-1.5 h-4 w-4 text-green-500"
                      />
                      Yes - Will renew automatically
                    </>
                  )}
                </p>
              </div>
              
              {subscription?.days_until_next_payment !== null && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Next Payment
                  </h4>
                  <p className="mt-1 flex items-center text-sm text-gray-900">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="mr-1.5 h-4 w-4 text-gray-400"
                    />
                    {subscription.days_until_next_payment === 0
                      ? "Today"
                      : subscription.days_until_next_payment === 1
                      ? "Tomorrow"
                      : `In ${subscription.days_until_next_payment} days`}
                  </p>
                </div>
              )}
              
              {subscription?.next_payment_date && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Next Payment Date
                  </h4>
                  <p className="mt-1 flex items-center text-sm text-gray-900">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="mr-1.5 h-4 w-4 text-gray-400"
                    />
                    {new Date(subscription.next_payment_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
         
              
         
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Created
                </h4>
                <p className="mt-1 flex items-center text-sm text-gray-900">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="mr-1.5 h-4 w-4 text-gray-400"
                  />
                  {subscription?.created_at
                    ? new Date(subscription.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : "N/A"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

  
    </div>
  );
}
