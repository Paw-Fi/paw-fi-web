import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export interface MetricConfig {
  icon: IconDefinition;
  value: string | number;
  label: string;
  gradientColors: string;
  iconColors: string;
  delay: number;
}

interface FinancialGlassMetricsPanelProps {
  title?: string;
  subtitle?: string;
  metrics: MetricConfig[];
  className?: string;
  compact?: boolean;
}

export function FinancialGlassMetricsPanel({
  title,
  subtitle,
  metrics,
  className = "",
  compact = false
}: FinancialGlassMetricsPanelProps) {
  // Financial Glass material variants
  const glassVariants: Variants = {
    initial: { 
      backdropFilter: "blur(0px)",
      background: "rgba(255, 255, 255, 0)"
    },
    animate: { 
      backdropFilter: "blur(20px)",
      background: "rgba(255, 255, 255, 0.08)",
      transition: { 
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }
    }
  };

  return (
    <motion.div 
      className={`rounded-2xl ${compact ? 'p-4' : 'p-6'} border border-white/20 dark:border-gray-700/50 shadow-xl backdrop-blur-xl ${className}`}
      variants={glassVariants}
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
      }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className={`text-center ${compact ? 'mb-4' : 'mb-6'}`}>
          {title && (
            <motion.h2 
              className="text-title font-bold text-gray-900 dark:text-white mb-2"
              style={{
                fontVariationSettings: "'wght' 600"
              }}
            >
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <p className="text-label text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className={`${compact ? 'flex items-center justify-between gap-6 overflow-x-auto' : 'grid grid-cols-4 gap-4'}`}>
        {metrics.map((metric, index) => (
          <div key={metric.label} className={`${compact ? 'flex items-center gap-3 min-w-0 flex-shrink-0' : 'text-center'}`}>
            {/* Icon */}
            <div className={`${compact ? 'w-8 h-8' : 'w-12 h-12 mx-auto'} bg-gradient-to-br ${metric.iconColors} rounded-${compact ? 'lg' : 'xl'} flex items-center justify-center ${compact ? 'mb-0' : 'mb-3'} shadow-${compact ? 'md' : 'lg'}`}>
              <FontAwesomeIcon 
                icon={metric.icon} 
                className={`${compact ? 'h-4 w-4' : 'w-6 h-6'} text-white`} 
              />
            </div>
            
            {/* Content */}
            <div className={compact ? 'flex flex-col' : ''}>
              {/* Kinetic Typography for metrics */}
              <motion.span 
                className={`${compact ? 'text-xl' : 'text-2xl'} font-bold bg-gradient-to-r ${metric.gradientColors} bg-clip-text text-transparent ${compact ? '' : 'block'}`}
                style={{
                  fontVariationSettings: "'wght' 700",
                  fontSize: compact ? undefined : "1.25rem"
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: { 
                    delay: metric.delay,
                    duration: 0.4,
                    ease: [0.2, 0.8, 0.4, 1]
                  }
                }}
              >
                {typeof metric.value === 'number' 
                  ? metric.value.toLocaleString() 
                  : metric.value
                }
              </motion.span>
              <span className={`${compact ? 'text-xs' : 'text-label'} text-gray-700 dark:text-gray-300 ${compact ? 'whitespace-nowrap' : ''} font-medium`}>
                {metric.label}
              </span>
            </div>
            
            {/* Divider for compact mode (except last item) */}
            {compact && index < metrics.length - 1 && (
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}