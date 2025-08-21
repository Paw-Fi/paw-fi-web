import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { planData } from "@/data/pricing-plans";
import { motion } from "framer-motion";

interface FeatureComparisonGridProps {
  prefersReducedMotion?: boolean;
}

export function FeatureComparisonGrid({ prefersReducedMotion }: FeatureComparisonGridProps) {
  const plans = Object.values(planData);
  
  const features = [
    {
      category: "Basic Lessons",
      key: "basicLessons" as const,
      description: "Core financial education lessons"
    },
    {
      category: "Advanced Courses", 
      key: "advancedCourses" as const,
      description: "Expert-generated courses by financial advisors"
    },
    {
      category: "AI Conversations",
      key: "aiConversations" as const,
      description: "Chat with Moneko & Finni AI assistants"
    },
    {
      category: "AI Personalized Lessons",
      key: "aiPersonalizedLessons" as const, 
      description: "Custom lessons based on your goals"
    },
    {
      category: "Goal Creation",
      key: "goalCreation" as const,
      description: "Create and track financial goals"
    },
    {
      category: "Goal Modification",
      key: "goalModification" as const,
      description: "Modify and AI-refine your goals"
    },
    {
      category: "Portfolio Tracking",
      key: "portfolioTracking" as const, 
      description: "Connect and monitor investment accounts"
    },
    {
      category: "Customer Support",
      key: "support" as const,
      description: "Get help when you need it"
    },
    {
      category: "1-on-1 Guidance",
      key: "oneOnOneGuidance" as const,
      description: "Personal sessions with financial experts"
    },
    {
      category: "Community Access",
      key: "communityAccess" as const,
      description: "Connect with other users"
    }
  ];


  const gridVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      className="mt-16 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-slate-800"
      variants={prefersReducedMotion ? undefined : gridVariants}
      initial={prefersReducedMotion ? undefined : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true }}
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white">Feature Comparison</h3>
        <p className="text-purple-100">Compare what you get with each plan</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Feature
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {plan.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <motion.tr
                key={feature.key}
                variants={prefersReducedMotion ? undefined : rowVariants}
                className={`${
                  index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-700"
                } border-b border-gray-200 dark:border-gray-600`}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {feature.category}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </div>
                </td>
                {plans.map((plan) => {
                  const planFeature = plan.featureComparison[feature.key];
                  return (
                    <td key={plan.id} className="px-6 py-4 text-center">
                      {planFeature.isIncluded ? (
                        <div className="flex flex-col items-center">
                          <FontAwesomeIcon
                            icon={faCheck}
                            className={`h-5 w-5 ${
                              planFeature.highlight
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-green-500 dark:text-green-400"
                            }`}
                          />
                          {planFeature.limit && (
                            <span
                              className={`mt-1 text-xs font-medium ${
                                planFeature.highlight
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {planFeature.limit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="h-5 w-5 text-gray-300 dark:text-gray-600"
                        />
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}