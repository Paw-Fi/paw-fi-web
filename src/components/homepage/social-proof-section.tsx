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
  faGraduationCap,
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
    value: "Built for",
    label: "Everyday budgets",
    description: "Track spending and plan with pockets you can actually use",
    color: "text-blue-600",
    progress: 85,
  },
  {
    icon: faDollarSign,
    value: "Capture",
    label: "Without friction",
    description: "Log from chat, receipts, voice notes, and notifications",
    color: "text-green-600",
    progress: 92,
  },
  {
    icon: faChartLine,
    value: "See",
    label: "What changed",
    description: "Understand where money went and what to adjust next",
    color: "text-purple-600",
    progress: 78,
  },
  {
    icon: faTrophy,
    value: "Keep",
    label: "Control",
    description: "Review and confirm details before saving changes",
    color: "text-yellow-600",
    progress: 98,
  },
  {
    icon: faShieldAlt,
    value: "Security",
    label: "Focused",
    description: "Designed with privacy and safety in mind",
    color: "text-indigo-600",
  },
  {
    icon: faGraduationCap,
    value: "Learn",
    label: "At your pace",
    description: "Bite-sized lessons and practical next steps",
    color: "text-emerald-600",
    progress: 95,
  },
];

const trustSignals = [
  "Chat-first workflow",
  "Household budgeting",
  "Pockets system",
  "Review before saving",
  "Multi-platform",
];

export function SocialProofSection() {
  return (
    <section className="relative z-10 bg-gradient-to-br from-slate-50/50 to-blue-50/30 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 dark:from-slate-900/50 dark:to-slate-800/30">
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
              className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-2 text-sm font-medium"
            >
              Built for real life
            </Badge>
          </motion.div>

          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Budgeting that fits how you live
          </motion.h2>

          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl md:text-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            A chat-first budgeting experience that helps you capture spending,
            plan with pockets, and stay consistent.
          </motion.p>
        </div>

        {/* Metrics Grid */}
        <div className="mb-12 grid grid-cols-1 gap-6 sm:mb-16 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="group h-full border-white/20 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/60">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-800 dark:to-slate-700 ${metric.color}`}
                    >
                      <FontAwesomeIcon icon={metric.icon} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <div className="text-foreground text-2xl font-bold sm:text-3xl">
                          {metric.value}
                        </div>
                        <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                          {metric.label}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                        {metric.description}
                      </p>
                      {metric.progress && (
                        <div className="space-y-2">
                          <Progress value={metric.progress} className="h-2" />
                          <div className="text-muted-foreground text-xs">
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
          <p className="text-muted-foreground mb-6 text-sm font-medium tracking-wide uppercase">
            Trusted & Recognized By
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
            {trustSignals.map((signal, index) => (
              <Badge
                key={signal}
                variant="outline"
                className="border-slate-200/50 bg-white/40 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/60 dark:border-slate-600/50 dark:bg-slate-800/40 dark:hover:bg-slate-700/60"
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
