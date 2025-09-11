import { motion, Variants } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface MetricConfig {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
  delay?: number;
}

interface CleanMetricsPanelProps {
  title?: string;
  subtitle?: string;
  metrics: MetricConfig[];
  className?: string;
  layout?: 'grid' | 'row';
}

export function CleanMetricsPanel({
  title,
  subtitle,
  metrics,
  className = "",
  layout = 'grid'
}: CleanMetricsPanelProps) {
  // Clean Apple-inspired animation variants
  const containerVariants: Variants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.4,
        staggerChildren: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    animate: { 
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <motion.div 
      className={`bg-background rounded-3xl p-8 ${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Clean Header */}
      {(title || subtitle) && (
        <motion.div className="text-center mb-8" variants={itemVariants}>
          {title && (
            <h2 className="text-2xl font-light text-foreground mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      {/* Clean Metrics Layout */}
      <div className={`${
        layout === 'row' 
          ? 'flex items-center justify-between gap-8' 
          : `grid grid-cols-${Math.min(metrics.length, 4)} gap-8`
      }`}>
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <motion.div 
              key={metric.label}
              className="text-center"
              variants={itemVariants}
            >
              {/* Clean Icon */}
              <div className="w-12 h-12 mx-auto mb-4 bg-muted/20 rounded-2xl flex items-center justify-center">
                <IconComponent className="h-6 w-6 text-muted-foreground" />
              </div>
              
              {/* Clean Value */}
              <motion.div 
                className={`text-3xl font-light mb-2 ${metric.color}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: { 
                    delay: (metric.delay || 0) + index * 0.1,
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }
                }}
              >
                {typeof metric.value === 'number' 
                  ? metric.value.toLocaleString() 
                  : metric.value
                }
              </motion.div>
              
              {/* Clean Label */}
              <div className="text-sm text-muted-foreground font-medium">
                {metric.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Backward compatibility - keep the old name but use the new clean implementation
export function FinancialGlassMetricsPanel(props: any) {
  // Convert old props to new format if needed
  const cleanProps = {
    ...props,
    layout: props.compact ? 'row' : 'grid',
  };
  return <CleanMetricsPanel {...cleanProps} />;
}

export type { MetricConfig, CleanMetricsPanelProps };