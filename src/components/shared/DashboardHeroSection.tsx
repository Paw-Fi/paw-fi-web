import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ActionButton {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
  component?: ReactNode;
}

interface MetricData {
  value: string | number;
  label: string;
  color: string;
}

interface DashboardHeroSectionProps {
  title: string;
  emoji?: string;
  description: string;
  actions?: ActionButton[];
  metrics?: MetricData[];
  className?: string;
}

export function DashboardHeroSection({
  title,
  emoji,
  description,
  actions = [],
  metrics,
  className = ""
}: DashboardHeroSectionProps) {
  // Clean Apple-inspired animation variants
  const itemVariants: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        staggerChildren: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <motion.section 
      className={`px-8 py-16 mb-16 ${className}`}
      variants={itemVariants}
      initial="initial"
      animate="animate"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Clean Hero Content */}
          <div className="flex-1 text-center md:text-left">
            <motion.div variants={itemVariants}>
              {/* Clean Typography */}
              <motion.h1 
                className="text-6xl font-light text-foreground mb-6 tracking-tight"
                variants={itemVariants}
              >
                {title}
                {emoji && (
                  <motion.span
                    className="inline-block ml-4"
                    animate={{ rotate: [0, 10, 0] }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      repeatDelay: 4,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                  >
                    {emoji}
                  </motion.span>
                )}
              </motion.h1>

              {/* Clean Description */}
              <motion.p 
                className="text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed"
                variants={itemVariants}
              >
                {description}
              </motion.p>
              
              {/* Clean Action Buttons */}
              {actions.length > 0 && (
                <motion.div 
                  className="flex flex-col sm:flex-row gap-6 items-center md:items-start justify-center md:justify-start"
                  variants={itemVariants}
                >
                  {actions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <motion.div
                        key={action.label}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {action.component || (
                          <button 
                            onClick={action.onClick}
                            className={`flex items-center gap-3 px-8 py-4 rounded-full font-medium text-lg transition-all duration-200 ${
                              action.variant === 'secondary'
                                ? 'border border-border bg-background hover:bg-muted/50'
                                : 'bg-primary text-primary-foreground hover:opacity-90'
                            }`}
                          >
                            <IconComponent className="h-5 w-5" />
                            <span>{action.label}</span>
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Clean Metrics Panel */}
          {metrics && metrics.length > 0 && (
            <motion.div 
              className="grid grid-cols-2 gap-8 min-w-[280px]"
              variants={itemVariants}
            >
              {metrics.map((metric, index) => (
                <motion.div 
                  key={metric.label}
                  className="text-center"
                  variants={itemVariants}
                >
                  <div className={`text-4xl font-light mb-2 ${metric.color}`}>
                    {typeof metric.value === 'number' 
                      ? metric.value.toLocaleString() 
                      : metric.value
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export type { ActionButton, DashboardHeroSectionProps, MetricData };