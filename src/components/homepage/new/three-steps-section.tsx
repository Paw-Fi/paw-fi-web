import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {  faDiscord } from "@fortawesome/free-brands-svg-icons";
import { DISCORD_URL } from "@/routes";
import { motion, Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface ThreeStepsSectionProps {
  data: {
    features?: Array<{
      title: string;
      description: string;
      icon: string;
      route: string;
    }>;
    hero: {
      ctaText: string;
      ctaRoute: string;
    };
    howItWorks?: {
      steps: Array<{
        title: string;
        description: string;
      }>;
    };
  };
}

// Default steps data from the mockup
const stepsData = [
  {
    title: "Set your goals",
    description: "Tell us what you want to achieve with your money. Whether it's saving for emergencies, buying a house, or planning for retirement, we'll help you set specific, achievable goals and create a roadmap to reach them."
  },
  {
    title: "Get your portfolios",
    description: "Our AI analyzes your goals and risk tolerance to build customized investment portfolios just for you. We handle all the research and selection, so you get expertly crafted portfolios without the complexity."
  },
  {
    title: "Grow on Autopilot",
    description: "Once your portfolios are set up, they work automatically to grow your wealth. Our system continuously monitors and rebalances your investments, so your money keeps working even when you're not thinking about it."
  }
];

export default function ThreeStepsSection({ data }: ThreeStepsSectionProps) {
  // Use dynamic steps if available, otherwise fall back to default
  const steps = data.howItWorks?.steps || stepsData;
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
      className="relative z-10 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <motion.div className="mb-16 text-center" variants={itemVariants}>
          <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
            3 Steps to Build Your Budget
          </h2>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => {
            return (
              <motion.div
                key={index}
                className="text-center p-6 rounded-2xl backdrop-blur-xl shadow-lg border border-white/20"
                variants={itemVariants}
              >
                <h3 className="text-xl font-bold text-foreground mb-4 font-lato">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-lato">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={itemVariants}
        >
          <div>
            <Button
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <a href={DISCORD_URL} target="_blank">
                <FontAwesomeIcon icon={faDiscord} className="mr-2" />
                Join Discord
              </a>
            </Button>
          </div>

          <div>
            <Button
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <Link to="/couple-budgeting" search={{ q: undefined }}>
                Try Moneko for free
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Trust indicator */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-6"
          variants={itemVariants}
        >
          Join the movement of never settling
        </motion.p>
      </div>
    </motion.section>
  );
}