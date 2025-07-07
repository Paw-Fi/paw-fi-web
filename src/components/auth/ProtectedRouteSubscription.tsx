import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt, faCreditCard, faArrowRight, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import logo from "@assets/images/icon.svg";

interface ProtectedRouteSubscriptionProps {
  children: React.ReactNode;
}

export function ProtectedRouteSubscription({ children }: ProtectedRouteSubscriptionProps) {
  const { user } = useAuth();
  const { subscription, isLoading } = useSubscription(user?.id);

  // If the user is not logged in, we'll let the parent handle this
  if (!user) {
    return <>{children}</>;
  }

  // While subscription data is loading, show a loading state
  if (isLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center px-4 py-12 text-center flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-300 to-purple-200 shadow-lg">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-gray-800">
          Loading Subscription Info...
        </h2>
      </motion.div>
    );
  }

  // Check if user has an active subscription
  const isActive = subscription && subscription.status === "active";
  
  // Check if user's subscription is expired
  const isExpired = subscription && subscription.status === "canceled";
  
  // If subscription is active, render children
  if (isActive) {
    return <>{children}</>;
  }

  // If user never had a subscription
  if (!subscription) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center px-4 py-12 text-center flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-300 shadow-lg"
          transition={{ duration: 0.5 }}
        >
          <img src={logo} className="size-16" />
        </motion.div>

        <motion.h2
          className="mb-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-3xl font-bold text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Premium Features Await!
        </motion.h2>

        <motion.p
          className="mb-8 max-w-md text-lg text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          This feature is available exclusively to our premium members.
          Upgrade your account today to unlock all the powerful tools we've built for your financial journey.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link to="/pricing" className="group">
            <motion.div
              className="flex items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 px-8 py-4 text-white shadow-lg transition-all duration-200"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <FontAwesomeIcon
                className="h-5 w-5"
                icon={faCreditCard}
              />
              <span className="text-lg font-medium">
                Become a Premium Member
              </span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  // If subscription is expired/canceled
  if (isExpired) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center px-4 py-12 text-center flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-300 shadow-lg"
          transition={{ duration: 0.5 }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="h-12 w-12 text-white" />
        </motion.div>

        <motion.h2
          className="mb-3 bg-gradient-to-r from-amber-500 to-red-400 bg-clip-text text-3xl font-bold text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Membership Expired
        </motion.h2>

        <motion.p
          className="mb-8 max-w-md text-lg text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Your premium membership has expired. Renew your subscription to continue
          enjoying all our premium features and tools designed to elevate your financial journey.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link to="/dashboard/membership" className="group">
            <motion.div
              className="flex items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-400 px-8 py-4 text-white shadow-lg transition-all duration-200"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <FontAwesomeIcon
                className="h-5 w-5"
                icon={faArrowRight}
              />
              <span className="text-lg font-medium">
                Renew Subscription
              </span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  // For any other subscription status (past due, unpaid, etc.)
  return (
    <motion.div
      className="flex flex-col items-center justify-center px-4 py-12 text-center flex-1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-300 shadow-lg"
        transition={{ duration: 0.5 }}
      >
        <FontAwesomeIcon icon={faExclamationTriangle} className="h-12 w-12 text-white" />
      </motion.div>

      <motion.h2
        className="mb-3 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-3xl font-bold text-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Subscription Issue
      </motion.h2>

      <motion.p
        className="mb-8 max-w-md text-lg text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        There appears to be an issue with your subscription (Status: {subscription.status}).
        Please visit your membership page to resolve this issue and regain access to premium features.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link to="/dashboard/membership" className="group">
          <motion.div
            className="flex items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-white shadow-lg transition-all duration-200"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
          >
            <FontAwesomeIcon
              className="h-5 w-5"
              icon={faArrowRight}
            />
            <span className="text-lg font-medium">
              Manage Subscription
            </span>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
