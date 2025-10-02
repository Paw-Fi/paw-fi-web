import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
// Import basic lessons data - handle potential large file
const getBasicLessonsData = async () => {
  try {
    const data = await import("@/data/basic-lessons.json");
    return data.default;
  } catch {
    return null;
  }
};

interface ExpertLessonsSectionProps {
  data: {
    lessons: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
    hero: {
      ctaRoute: string;
    };
  };
}

// Fallback lessons data
const defaultLessons = [
  {
    title: "Beginner's Guide to Investing",
    description: "From paying off debt to building your first portfolio, Moneko starts with your income and what you want to achieve.",
    icon: null
  },
  {
    title: "Behavioral Finance: Master Your Money Mindset",
    description: "Spot common biases like loss aversion and overconfidence, and learn how to make smarter investment choices.",
    icon: null
  },
  {
    title: "Explore All Lessons",
    description: "Unlock 10 foundational courses that make investing simple and actionable.",
    icon: null
  }
];

export default function ExpertLessonsSection({ data }: ExpertLessonsSectionProps) {
  const lessons = defaultLessons;
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.section 
      className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <motion.div className="mb-16 text-center" variants={itemVariants}>
          <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
            Level Up Your Budgeting Skills
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto font-lato">
            Clear, bite-sized lessons that turn budgeting concepts into practical steps. Start with the basics and build smart money habits at your pace.
          </p>
        </motion.div>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lessons.map((lesson, index) => {
            return (
              <motion.div
                key={index}
                className="group p-8 rounded-2xl backdrop-blur-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
                variants={itemVariants}
              >
                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors font-lato">
                  {lesson.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6 font-lato">
                  {lesson.description}
                </p>

                {/* CTA - Special handling for the last card */}
                {index === lessons.length - 1 ? (
                  <div className="flex justify-center">
                    <Button
                      asChild
                      className="w-16 h-16 rounded-xl p-0 flex items-center justify-center border border-white/20"
                    >
                      <Link to="/dashboard/learning">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Link 
                    to="/dashboard/learning"
                    className="text-primary hover:text-primary/90 font-medium flex items-center gap-2 transition-colors"
                  >
                    Start Lesson
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}