import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUsers, 
  faDollarSign, 
  faChartLine, 
  faTrophy,
  faShieldAlt,
  faGraduationCap
} from "@fortawesome/free-solid-svg-icons";

interface SocialProofMetric {
  icon: any;
  value: string;
  label: string;
  description: string;
  color: string;
  progress?: number;
}

const metrics: SocialProofMetric[] = [
  {
    icon: faUsers,
    value: "50,000+",
    label: "Active Users",
    description: "Trust Moneko for their financial journey",
    color: "text-blue-600",
    progress: 85
  },
  {
    icon: faDollarSign,
    value: "$2.3M+",
    label: "Money Saved",
    description: "Through AI-powered budgeting insights",
    color: "text-green-600",
    progress: 92
  },
  {
    icon: faChartLine,
    value: "127%",
    label: "Average Portfolio Growth",
    description: "Compared to traditional savings accounts",
    color: "text-purple-600",
    progress: 78
  },
  {
    icon: faTrophy,
    value: "4.9/5",
    label: "User Satisfaction",
    description: "Based on 10,000+ verified reviews",
    color: "text-yellow-600",
    progress: 98
  },
  {
    icon: faShieldAlt,
    value: "Bank-Level",
    label: "Security",
    description: "256-bit encryption & SOC 2 compliance",
    color: "text-indigo-600"
  },
  {
    icon: faGraduationCap,
    value: "95%",
    label: "Financial Literacy Improvement",
    description: "Users report better money management skills",
    color: "text-emerald-600",
    progress: 95
  }
];

const trustSignals = [
  "Featured in TechCrunch",
  "Y Combinator Alumni",
  "SOC 2 Certified",
  "FDIC Insured Partners",
  "CFA Certified Team"
];

export function SocialProofSection() {
  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-slate-900/50 dark:to-slate-800/30">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-12 text-center sm:mb-16 md:mb-20">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge 
              variant="secondary" 
              className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium"
            >
              Trusted by Thousands
            </Badge>
          </motion.div>
          
          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Join the Financial Success Revolution
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl md:text-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Real people achieving real financial results with Moneko's AI-powered platform
          </motion.p>
        </div>

        {/* Metrics Grid */}
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:mb-16">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="group h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start space-x-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-md ${metric.color}`}>
                      <FontAwesomeIcon 
                        icon={metric.icon} 
                        className="h-6 w-6" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <div className="text-2xl font-bold text-foreground sm:text-3xl">
                          {metric.value}
                        </div>
                        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {metric.label}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {metric.description}
                      </p>
                      {metric.progress && (
                        <div className="space-y-2">
                          <Progress 
                            value={metric.progress} 
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            {metric.progress}% achievement rate
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Signals */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-muted-foreground mb-6 text-sm font-medium uppercase tracking-wide">
            Trusted & Recognized By
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
            {trustSignals.map((signal, index) => (
              <Badge
                key={signal}
                variant="outline"
                className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50 px-4 py-2 text-sm font-medium hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors"
              >
                {signal}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
