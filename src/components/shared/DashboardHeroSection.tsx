import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { ReactNode } from "react";
import { FinancialGlassMetricsPanel, MetricConfig } from "./FinancialGlassMetricsPanel";

interface ActionButton {
  label: string;
  icon: IconDefinition;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
  component?: ReactNode;
}

interface DashboardHeroSectionProps {
  title: string;
  titleGradient?: string;
  emoji?: string;
  emojiAnimation?: {
    rotate?: number[];
    duration?: number;
    repeatDelay?: number;
  };
  description: string;
  actions?: ActionButton[];
  metrics?: MetricConfig[];
  metricsTitle?: string;
  metricsSubtitle?: string;
  showMetrics?: boolean;
  backgroundGradient?: string;
  decorativeGradients?: {
    topRight: string;
    bottomLeft: string;
  };
  className?: string;
}

export function DashboardHeroSection({
  title,
  titleGradient = "from-blue-600 dark:from-blue-400 via-purple-600 dark:via-purple-400 to-indigo-600 dark:to-indigo-400",
  emoji,
  emojiAnimation = { rotate: [0, 15, 0], duration: 2, repeatDelay: 4 },
  description,
  actions = [],
  metrics,
  metricsTitle,
  metricsSubtitle,
  showMetrics = true,
  backgroundGradient = "from-blue-600/5 dark:from-blue-400/10 via-purple-600/5 dark:via-purple-400/10 to-indigo-600/5 dark:to-indigo-400/10",
  decorativeGradients = {
    topRight: "bg-blue-400/10 dark:bg-blue-400/20",
    bottomLeft: "bg-purple-400/10 dark:bg-purple-400/20"
  },
  className = ""
}: DashboardHeroSectionProps) {
  // Animation variants
  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: [0.25, 0.8, 0.5, 1]
      }
    }
  };

  return (
    <motion.section 
      className={`relative px-4 md:px-6 py-8 md:py-12 mb-8 overflow-hidden ${className}`}
      variants={itemVariants}
    >
      {/* Background decoration with glass effects */}
      <div className={`absolute inset-0 bg-gradient-to-r ${backgroundGradient} rounded-3xl`} />
      <div className={`absolute -top-40 -right-40 w-80 h-80 ${decorativeGradients.topRight} rounded-full blur-3xl`} />
      <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${decorativeGradients.bottomLeft} rounded-full blur-3xl`} />
      
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Hero Content with Expressive Typography */}
          <div className="flex-1">
            <motion.div variants={itemVariants}>
              {/* Display Level Typography */}
              <motion.h1 
                className="text-display font-bold mb-4 leading-tight tracking-tight"
                style={{
                  fontVariationSettings: "'wght' 700",
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  lineHeight: "1.1",
                  letterSpacing: "-0.02em"
                }}
                variants={{
                  initial: { 
                    opacity: 0, 
                    y: 30,
                    fontVariationSettings: "'wght' 400"
                  },
                  animate: { 
                    opacity: 1, 
                    y: 0,
                    fontVariationSettings: "'wght' 700",
                    transition: { 
                      duration: 0.6,
                      ease: [0.2, 0.8, 0.4, 1]
                    }
                  }
                }}
              >
                <span className={`bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}>
                  {title}
                </span>
                {emoji && (
                  <motion.span
                    className="inline-block ml-3"
                    animate={{ rotate: emojiAnimation.rotate }}
                    transition={{ 
                      duration: emojiAnimation.duration, 
                      repeat: Infinity, 
                      repeatDelay: emojiAnimation.repeatDelay 
                    }}
                  >
                    {emoji}
                  </motion.span>
                )}
              </motion.h1>

              {/* Body Typography with better spacing */}
              <motion.p 
                className="text-body text-muted-foreground mb-6 md:mb-8 max-w-2xl leading-relaxed"
                style={{
                  fontSize: "1rem",
                  fontWeight: "400",
                  lineHeight: "1.6"
                }}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { 
                    opacity: 1, 
                    y: 0,
                    transition: { 
                      duration: 0.4,
                      delay: 0.2,
                      ease: [0.25, 0.8, 0.5, 1]
                    }
                  }
                }}
              >
                {description}
              </motion.p>
              
              {/* Action Buttons */}
              {actions.length > 0 && (
                <motion.div 
                  className="flex flex-wrap gap-3 md:gap-4"
                  variants={{
                    initial: { opacity: 0, y: 20 },
                    animate: { 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        duration: 0.4,
                        delay: 0.3,
                        ease: [0.25, 0.8, 0.5, 1]
                      }
                    }
                  }}
                >
                  {actions.map((action, index) => (
                    <motion.div
                      key={action.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {action.component || (
                        <button 
                          onClick={action.onClick}
                          className={`group flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                            action.variant === 'secondary'
                              ? 'bg-background/80 backdrop-blur-sm border-2 border-border/50 text-foreground hover:border-primary/50 hover:text-primary'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20 dark:shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40'
                          }`}
                        >
                          <FontAwesomeIcon icon={action.icon} className="h-4 md:h-5 w-4 md:w-5" />
                          <span className="text-sm md:text-base">{action.label}</span>
                         
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Financial Glass Metrics Panel */}
          {showMetrics && metrics && metrics.length > 0 && (
            <FinancialGlassMetricsPanel
              title={metricsTitle}
              subtitle={metricsSubtitle}
              compact={metrics.length > 4}
              className="min-w-[280px] md:min-w-[320px]"
              metrics={metrics}
            />
          )}
        </div>
      </div>
    </motion.section>
  );
}

export type { ActionButton, DashboardHeroSectionProps };