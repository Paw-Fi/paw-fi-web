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
    <section
      className="mt-20 space-y-16"
      variants={prefersReducedMotion ? undefined : staggerVariants}
      initial={prefersReducedMotion ? undefined : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true }}
    >
      {/* Trust Stats */}
      <div 
        className="grid grid-cols-2 gap-6 md:grid-cols-4"
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-xl bg-subtle-background p-6 text-center transition-all duration-200 hover:shadow-sm"
          >
            <div className="text-2xl font-bold text-primary">
              {stat.number}
            </div>
            <div className="text-sm text-muted-foreground-color mt-2">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        <h3 className="mb-12 text-center text-2xl font-bold text-foreground">
          What Our Students Say
        </h3>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-xl bg-card p-8 shadow-sm transition-all duration-200 hover:shadow-md"
              variants={prefersReducedMotion ? undefined : cardVariants}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={faStar}
                      className="h-4 w-4 text-warning"
                    />
                  ))}
                </div>
                <FontAwesomeIcon
                  icon={faQuoteLeft}
                  className="h-6 w-6 text-muted-foreground-color/30"
                />
              </div>
              <blockquote className="mb-6 text-sm text-muted-foreground-color leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div className="pt-4">
                <div className="font-semibold text-foreground">
                  {testimonial.author}
                </div>
                <div className="text-xs text-muted-foreground-color mt-1">
                  {testimonial.role}
                </div>
                <div className="mt-2 inline-block rounded-full bg-subtle-background px-3 py-1 text-xs font-medium text-primary">
                  {testimonial.plan} User
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Trust Badges */}
      <div
        className="rounded-xl bg-subtle-background p-8 text-center"
        variants={prefersReducedMotion ? undefined : cardVariants}
      >
        <h4 className="mb-6 text-lg font-semibold text-foreground">
          Your Financial Data is Secure
        </h4>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground-color">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span>Bank-Level Encryption</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span>SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span>Read-Only Account Access</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span>30-Day Money Back</span>
          </div>
        </div>
      </div>
    </section>
  );
}