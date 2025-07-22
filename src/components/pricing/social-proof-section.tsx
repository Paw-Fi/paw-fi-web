import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faQuoteLeft } from "@fortawesome/free-solid-svg-icons";

interface SocialProofSectionProps {
  prefersReducedMotion?: boolean;
}

export function SocialProofSection({ prefersReducedMotion }: SocialProofSectionProps) {
  const testimonials = [
    {
      quote: "Moneko's AI-personalized lessons helped me understand investing concepts I'd been struggling with for months. The portfolio tracking feature is a game-changer.",
      author: "Sarah Chen",
      role: "Software Engineer",
      plan: "Wealth Builder",
      rating: 5
    },
    {
      quote: "As a complete beginner, the Investor plan gave me exactly what I needed - comprehensive courses without overwhelming complexity. Now I'm confidently building my portfolio.",
      author: "Marcus Rodriguez", 
      role: "Teacher",
      plan: "Investor",
      rating: 5
    },
    {
      quote: "The advanced courses by financial advisors are incredibly detailed. I've learned more in 3 months with Moneko than 2 years of trying to figure it out alone.",
      author: "Jennifer Wu",
      role: "Marketing Manager", 
      plan: "Wealth Builder",
      rating: 5
    }
  ];

  const stats = [
    { number: "10,000+", label: "Students Educated" },
    { number: "95%", label: "Feel More Confident" },
    { number: "$2.4M+", label: "Portfolio Value Tracked" },
    { number: "4.9/5", label: "Average Rating" }
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  return (
    <motion.section
      className="mt-16 space-y-12"
      variants={prefersReducedMotion ? undefined : staggerVariants}
      initial={prefersReducedMotion ? undefined : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true }}
    >
      {/* Trust Stats */}
      <motion.div 
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg bg-white/80 p-4 text-center shadow-sm backdrop-blur-sm dark:bg-slate-800/80"
          >
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stat.number}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Testimonials */}
      <motion.div
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        <h3 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white">
          What Our Students Say
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800"
              variants={prefersReducedMotion ? undefined : cardVariants}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={faStar}
                      className="h-4 w-4 text-yellow-400"
                    />
                  ))}
                </div>
                <FontAwesomeIcon
                  icon={faQuoteLeft}
                  className="h-6 w-6 text-purple-200 dark:text-purple-800"
                />
              </div>
              <blockquote className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                "{testimonial.quote}"
              </blockquote>
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.author}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {testimonial.role}
                </div>
                <div className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {testimonial.plan} User
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Security & Trust Badges */}
      <motion.div
        className="rounded-xl bg-gradient-to-r from-green-50 to-blue-50 p-6 text-center dark:from-green-900/20 dark:to-blue-900/20"
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Your Financial Data is Secure
        </h4>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Bank-Level Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Read-Only Account Access</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>30-Day Money Back</span>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}