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
    <div
      className="mt-20 overflow-hidden rounded-xl bg-card shadow-sm"    
    >
      <div className="bg-subtle-background px-8 py-6">
        <h3 className="text-xl font-bold text-foreground">Feature Comparison</h3>
        <p className="text-muted-foreground-color mt-2">Compare what you get with each plan</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-subtle-background">
              <th className="px-8 py-5 text-left text-sm font-semibold text-foreground">
                Feature
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="px-6 py-5 text-center text-sm font-semibold text-foreground"
                >
                  {plan.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr
                key={feature.key}               
                className="hover:bg-subtle-background/50 transition-colors duration-150"
              >
                <td className="px-8 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {feature.category}
                  </div>
                  <div className="text-xs text-muted-foreground-color mt-1">
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
                                ? "text-primary"
                                : "text-success"
                            }`}
                          />
                          {planFeature.limit && (
                            <span
                              className={`mt-1 text-xs font-medium ${
                                planFeature.highlight
                                  ? "text-primary"
                                  : "text-muted-foreground-color"
                              }`}
                            >
                              {planFeature.limit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="h-5 w-5 text-muted-foreground-color/50"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}