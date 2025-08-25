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
      className={`relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 mb-6 sm:mb-8 overflow-hidden ${className}`}
      variants={itemVariants}
    >
      {/* Background decoration with glass effects */}
      <div className={`absolute inset-0 bg-gradient-to-r ${backgroundGradient} rounded-2xl sm:rounded-3xl`} />
      <div className={`absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 ${decorativeGradients.topRight} rounded-full blur-2xl sm:blur-3xl opacity-60 sm:opacity-100`} />
      <div className={`absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 ${decorativeGradients.bottomLeft} rounded-full blur-2xl sm:blur-3xl opacity-60 sm:opacity-100`} />
      
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 lg:gap-12">
          {/* Hero Content with Expressive Typography */}
          <div className="flex-1">
            <motion.div variants={itemVariants}>
              {/* Display Level Typography */}
              <motion.h1 
                className="text-display font-bold mb-3 sm:mb-4 leading-tight tracking-tight text-center md:text-left"
                style={{
                  fontVariationSettings: "'wght' 700",
                  fontSize: "clamp(1.75rem, 3.5vw, 3.5rem)",
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
                className="text-body text-muted-foreground mb-4 sm:mb-6 lg:mb-8 max-w-2xl leading-relaxed text-center md:text-left"
                style={{
                  fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
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
                  className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-center md:items-start justify-center md:justify-start"
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
                          className={`group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-300 min-h-[48px] touch-manipulation w-full sm:w-auto ${
                            action.variant === 'secondary'
                              ? 'bg-background/80 backdrop-blur-sm border-2 border-border/50 text-foreground hover:border-primary/50 hover:text-primary'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20 dark:shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40'
                          }`}
                        >
                          <FontAwesomeIcon icon={action.icon} className="h-4 sm:h-5 w-4 sm:w-5" />
                          <span className="text-sm sm:text-base">{action.label}</span>
                         
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
              className="w-full sm:min-w-[280px] md:min-w-[300px] lg:min-w-[320px] max-w-[380px]"
              metrics={metrics}
            />
          )}
        </div>
      </div>
    </motion.section>
  );
}

export type { ActionButton, DashboardHeroSectionProps };