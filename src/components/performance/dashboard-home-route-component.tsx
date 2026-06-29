// "use client";

// import React from "react";
// import { PremiumAccessGate } from "@/features/premium-dashboard/components/premium-access-gate";
// import { PremiumDashboardHome } from "@/features/premium-dashboard/components/premium-dashboard-home";
// import { PremiumUpgradePreview } from "@/features/premium-dashboard/components/premium-upgrade-preview";

// export function DashboardHomeRouteComponent() {
//   return (
//     <PremiumAccessGate fallback={<PremiumUpgradePreview />}>
//       <PremiumDashboardHome />
//     </PremiumAccessGate>
//   );
// }

// export default DashboardHomeRouteComponent;
"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { motion } from "framer-motion";
import { Construction, Smartphone, Sparkles } from "lucide-react";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function DashboardHomeRouteComponent() {
  const { user } = useAuth();

  // Early return - Dashboard web is under development
  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <main className="relative z-10 pt-24 px-4 md:px-6 max-w-[1200px] mx-auto pb-24">
        {/* Hero Section */}
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
            >
              <Construction className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Under Development
              </span>
            </motion.div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
                We're Building Something
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                  Amazing
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                The web dashboard is currently under development. 
                Download our mobile app to continue enjoying all features and track your finances on the go.
              </p>
            </div>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <AppleDownloadButton className="h-[52px] w-full sm:w-auto" />
              <AndroidDownloadButton className="h-[52px] w-full sm:w-auto" />
            </motion.div>
        

            {/* Membership Management Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="pt-8"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Need to manage your subscription?
              </p>
              <Button variant="outline" asChild>
                <Link to="/dashboard/user-settings/membership">
                  Manage Membership
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

export default DashboardHomeRouteComponent;
